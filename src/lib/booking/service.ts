import { sql, VercelPoolClient } from "@vercel/postgres";
import { logActivity } from "@/lib/db/activity-log";
import { checkAntiSpam } from "@/lib/anti-spam";
import { BookingError, createBookingError } from "./errors";
import type { BookingRequestInput } from "./schema";
import { getSalonId } from "@/lib/multi-tenant";

export interface CreateBookingResult {
  id: string;
  start_time: string;
  end_time: string;
}

interface SalonWorkingHours {
  [key: string]: { open: string; close: string } | null;
}

interface SalonInfo {
  working_hours: SalonWorkingHours;
  specific_days_off?: string[];
  allow_overflow?: boolean;
  overflow_minutes?: number;
  slot_buffer_minutes?: number;
  slot_interval_minutes?: number;
}

function normalizeTimes(input: BookingRequestInput) {
  const normStart = input.start_time.slice(0, 5);
  const normEnd = input.end_time.slice(0, 5);
  return { normStart, normEnd };
}

function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getIranDay(dateString: string): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const jsDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const jsDay = jsDate.getDay();
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return dayMap[jsDay === 6 ? 0 : jsDay + 1];
}

async function fetchServiceDuration(client: VercelPoolClient, serviceId: string, salonId: string | null): Promise<number> {
  const result = salonId
    ? await client.query(`SELECT duration_minutes FROM services WHERE id = $1 AND salon_id = $2`, [serviceId, salonId])
    : await client.query(`SELECT duration_minutes FROM services WHERE id = $1`, [serviceId]);
  const { rows } = result;
  if (rows.length === 0) {
    throw createBookingError("SERVICE_NOT_FOUND");
  }
  return Number(rows[0].duration_minutes);
}

async function fetchAddonsDuration(
  client: VercelPoolClient,
  selectedAddons: string[],
  salonId: string | null
): Promise<number> {
  if (selectedAddons.length === 0) return 0;

  const addonResult = salonId
    ? await client.query(
        `SELECT id, duration_minutes FROM addons WHERE id = ANY($1) AND salon_id = $2 AND is_active = true`,
        [selectedAddons, salonId]
      )
    : await client.query(
        `SELECT id, duration_minutes FROM addons WHERE id = ANY($1) AND is_active = true`,
        [selectedAddons]
      );
  const { rows: addonRows } = addonResult;

  if (addonRows.length !== selectedAddons.length) {
    throw createBookingError("INVALID_ADDONS");
  }

  return addonRows.reduce(
    (sum: number, r: { duration_minutes?: string | number }) =>
      sum + Number(r.duration_minutes || 0),
    0
  );
}

async function fetchSalonInfo(client: VercelPoolClient): Promise<SalonInfo> {
  const salonId = getSalonId();
  const result = salonId
    ? await client.query(
        `SELECT working_hours, specific_days_off, allow_overflow, overflow_minutes, slot_buffer_minutes, slot_interval_minutes
         FROM salons WHERE id = $1 LIMIT 1`,
        [salonId]
      )
    : await client.query(
        `SELECT working_hours, specific_days_off, allow_overflow, overflow_minutes, slot_buffer_minutes, slot_interval_minutes
         FROM salon_info LIMIT 1`
      );
  return (result.rows[0] as SalonInfo) || {};
}

function validateEndTimeMatchesService(
  normStart: string,
  normEnd: string,
  serviceDuration: number,
  addonsDuration: number,
  salonInfo: SalonInfo
): void {
  const buffer = Number(salonInfo.slot_buffer_minutes || 0);
  const resolution = Number(salonInfo.slot_interval_minutes || 15);

  const rawDuration = serviceDuration + addonsDuration;
  const expectedMinutes =
    buffer > 0
      ? Math.ceil((rawDuration + buffer) / resolution) * resolution
      : Math.ceil(rawDuration / resolution) * resolution;

  const startMinutes = parseMinutes(normStart);
  const expectedEndMinutes = startMinutes + expectedMinutes;
  const expectedEnd = `${String(Math.floor(expectedEndMinutes / 60)).padStart(2, "0")}:${String(expectedEndMinutes % 60).padStart(2, "0")}`;

  if (normEnd !== expectedEnd) {
    throw createBookingError("DURATION_MISMATCH");
  }
}

function validateWithinWorkingHours(
  normStart: string,
  normEnd: string,
  dateGregorian: string,
  salonInfo: SalonInfo
): void {
  const daysOff = salonInfo.specific_days_off;
  if (Array.isArray(daysOff) && daysOff.includes(dateGregorian)) {
    throw createBookingError("DAY_OFF");
  }

  const workingHours = salonInfo.working_hours;
  if (!workingHours || typeof workingHours !== "object") return;

  const iranDay = getIranDay(dateGregorian);
  const dayHours = workingHours[iranDay];

  if (!dayHours) {
    throw createBookingError("DAY_OFF");
  }

  const openMinutes = parseMinutes(dayHours.open);
  const closeMinutes = parseMinutes(dayHours.close);
  const startMinutes = parseMinutes(normStart);
  const endMinutes = parseMinutes(normEnd);

  const allowOverflow = salonInfo.allow_overflow ?? false;
  const overflowMinutes = salonInfo.overflow_minutes ?? 0;
  const hardEndLimit = closeMinutes + (allowOverflow ? overflowMinutes : 0);

  if (startMinutes < openMinutes || endMinutes > hardEndLimit) {
    throw createBookingError("TIME_OUTSIDE_WORKING_HOURS");
  }
}

async function assertSlotNotOverlapping(
  client: VercelPoolClient,
  dateGregorian: string,
  normStart: string,
  normEnd: string,
  salonId: string | null
): Promise<void> {
  // Serialize booking attempts for the same tenant/day before checking
  // intervals. The unique index protects exact duplicates; this lock also
  // closes the race for partially overlapping intervals.
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`${salonId ?? "legacy"}:${dateGregorian}`]
  );

  const conflictResult = await client.query(
    salonId
      ? `SELECT id FROM bookings
         WHERE salon_id = $1 AND date_gregorian = $2::date
         AND status IN ('reserved', 'confirmed', 'in_progress')
         AND start_time < ($3 || ':00')::time
         AND end_time > ($4 || ':00')::time
         FOR UPDATE`
      : `SELECT id FROM bookings
         WHERE date_gregorian = $1::date
         AND status IN ('reserved', 'confirmed', 'in_progress')
         AND start_time < ($2 || ':00')::time
         AND end_time > ($3 || ':00')::time
         FOR UPDATE`,
    salonId
      ? [salonId, dateGregorian, normEnd, normStart]
      : [dateGregorian, normEnd, normStart]
  );
  if (conflictResult.rows.length > 0) {
    throw createBookingError("SLOT_TAKEN");
  }
}

async function assertSlotNotBlocked(
  client: VercelPoolClient,
  dateGregorian: string,
  normStart: string,
  normEnd: string,
  salonId: string | null
): Promise<void> {
  const blockedCheck = await client.query(
    salonId
      ? `SELECT id FROM blocked_times
         WHERE salon_id = $1 AND date_gregorian = $2::date
         AND start_time < ($3 || ':00')::time
         AND end_time > ($4 || ':00')::time
         FOR UPDATE`
      : `SELECT id FROM blocked_times
         WHERE date_gregorian = $1::date
         AND start_time < ($2 || ':00')::time
         AND end_time > ($3 || ':00')::time
         FOR UPDATE`,
    salonId
      ? [salonId, dateGregorian, normEnd, normStart]
      : [dateGregorian, normEnd, normStart]
  );

  if (blockedCheck.rows.length > 0) {
    throw createBookingError("SLOT_BLOCKED");
  }
}

async function insertBooking(
  client: VercelPoolClient,
  input: BookingRequestInput,
  userId: string | null,
  phone: string,
  normStart: string,
  normEnd: string,
  salonId: string | null
): Promise<CreateBookingResult> {
  const jalaliDate = input.date || input.date_gregorian;

  const insertSql = salonId
    ? `INSERT INTO bookings (
        user_id, salon_id, customer_phone, customer_name, service_id,
        selected_addons, date, date_gregorian, start_time, end_time,
        status, phone_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, ($9 || ':00')::time, ($10 || ':00')::time, 'reserved', true, NOW())`
    : `INSERT INTO bookings (
        user_id, customer_phone, customer_name, service_id,
        selected_addons, date, date_gregorian, start_time, end_time,
        status, phone_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, ($8 || ':00')::time, ($9 || ':00')::time, 'reserved', true, NOW())`;
  const result = await client.query(
    `${insertSql}
     ON CONFLICT DO NOTHING
     RETURNING id, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
    salonId
      ? [userId, salonId, phone, input.customer_name || "", input.service_id, JSON.stringify(input.selected_addons || []), jalaliDate, input.date_gregorian, normStart, normEnd]
      : [userId, phone, input.customer_name || "", input.service_id, JSON.stringify(input.selected_addons || []), jalaliDate, input.date_gregorian, normStart, normEnd]
  );

  if (result.rows.length === 0) {
    throw createBookingError("SLOT_TAKEN");
  }

  return {
    id: result.rows[0].id,
    start_time: result.rows[0].start_time,
    end_time: result.rows[0].end_time,
  };
}

export async function createBooking(
  input: BookingRequestInput,
  verifiedUserId: string | null,
  phone: string
): Promise<CreateBookingResult> {
  const { normStart, normEnd } = normalizeTimes(input);

  if (normEnd >= "24:00") {
    throw createBookingError("TIME_INVALID");
  }

  if (normEnd <= normStart) {
    throw createBookingError("TIME_RANGE_INVALID");
  }

  const spamCheck = await checkAntiSpam(phone);
  if (!spamCheck.allowed) {
    throw createBookingError("SPAM_DETECTED", spamCheck.error);
  }

  const client = await sql.connect();

  try {
    await client.query("BEGIN");

    const salonId = getSalonId();
    const [serviceDuration, addonsDuration, salonInfo] = await Promise.all([
      fetchServiceDuration(client, input.service_id, salonId),
      fetchAddonsDuration(client, input.selected_addons, salonId),
      fetchSalonInfo(client),
    ]);

    validateEndTimeMatchesService(
      normStart,
      normEnd,
      serviceDuration,
      addonsDuration,
      salonInfo
    );

    validateWithinWorkingHours(normStart, normEnd, input.date_gregorian, salonInfo);

    await assertSlotNotOverlapping(client, input.date_gregorian, normStart, normEnd, salonId);
    await assertSlotNotBlocked(client, input.date_gregorian, normStart, normEnd, salonId);

    const booking = await insertBooking(
      client,
      input,
      verifiedUserId,
      phone,
      normStart,
      normEnd,
      salonId
    );

    await client.query("COMMIT");

    logActivity({
      eventType: "booking_created",
      entityType: "booking",
      entityId: booking.id,
      description: `${input.customer_name || "مشتری"} نوبت جدید رزرو کرد`,
      metadata: {
        service_id: input.service_id,
        date_gregorian: input.date_gregorian,
        start_time: normStart,
        end_time: normEnd,
        phone,
      },
    });

    return booking;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("ROLLBACK failed:", rollbackError);
    }

    if (error instanceof BookingError) {
      throw error;
    }

    const pgError = error as { code?: string };
    if (pgError?.code === "23505") {
      throw createBookingError("SLOT_TAKEN");
    }

    console.error("[BOOK] Error:", (error as { code?: string }).code || "unknown");
    throw createBookingError("SERVER_ERROR");
  } finally {
    client.release();
  }
}
