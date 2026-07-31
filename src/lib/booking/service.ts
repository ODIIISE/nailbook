import { sql, VercelPoolClient } from "@vercel/postgres";
import { logActivity } from "@/lib/db/activity-log";
import { checkAntiSpam } from "@/lib/anti-spam";
import { BookingError, createBookingError } from "./errors";
import { gregorianToJalali } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";
import type { BookingRequestInput } from "./schema";

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
  // JS: 0=Sun ... 6=Sat. The booking engine's working-hours keys
  // start on Saturday, so use the same mapping as slots.ts.
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return dayMap[jsDay];
}

async function fetchService(client: VercelPoolClient, serviceId: string): Promise<{ durationMinutes: number; addonIds: string[] }> {
  const { rows } = await client.query(
    `SELECT duration_minutes, addon_ids FROM services WHERE id = $1 AND is_active = true`,
    [serviceId]
  );
  if (rows.length === 0) {
    throw createBookingError("SERVICE_NOT_FOUND");
  }
  const rawAddonIds = rows[0].addon_ids;
  const addonIds = Array.isArray(rawAddonIds)
    ? rawAddonIds.filter((id: unknown): id is string => typeof id === "string")
    : typeof rawAddonIds === "string"
      ? rawAddonIds.replace(/^\{|\}$/g, "").split(",").map((id: string) => id.replace(/^"|"$/g, "").trim()).filter(Boolean)
      : [];
  return { durationMinutes: Number(rows[0].duration_minutes), addonIds };
}

async function fetchAddonsDuration(
  client: VercelPoolClient,
  selectedAddons: string[],
  allowedAddonIds: string[]
): Promise<number> {
  if (selectedAddons.length === 0) return 0;
  if (selectedAddons.some((id) => !allowedAddonIds.includes(id))) {
    throw createBookingError("INVALID_ADDONS");
  }

  const { rows: addonRows } = await client.query(
    `SELECT id, duration_minutes FROM addons WHERE id = ANY($1) AND is_active = true`,
    [selectedAddons]
  );

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
  const { rows } = await client.query(
    `SELECT working_hours, specific_days_off, allow_overflow, overflow_minutes, slot_buffer_minutes, slot_interval_minutes
     FROM salon_info LIMIT 1`
  );
  return (rows[0] as SalonInfo) || {};
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

async function assertSlotAvailable(
  client: VercelPoolClient,
  dateGregorian: string,
  normStart: string,
  normEnd: string
): Promise<void> {
  // The unique index protects only identical start/end pairs. Serialize all
  // bookings for this date and explicitly reject partial overlaps as well,
  // otherwise 10:00–11:00 and 10:30–11:30 could both be accepted.
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [dateGregorian]);

  const bookedCheck = await client.query(
    `SELECT id FROM bookings
     WHERE date_gregorian = $1::date
     AND status IN ('reserved', 'confirmed', 'in_progress')
     AND start_time < ($2 || ':00')::time
     AND end_time > ($3 || ':00')::time
     LIMIT 1
     FOR UPDATE`,
    [dateGregorian, normEnd, normStart]
  );

  if (bookedCheck.rows.length > 0) {
    throw createBookingError("SLOT_TAKEN");
  }

  const blockedCheck = await client.query(
    `SELECT id FROM blocked_times
     WHERE date_gregorian = $1::date
     AND start_time < ($2 || ':00')::time
     AND end_time > ($3 || ':00')::time
     LIMIT 1
     FOR UPDATE`,
    [dateGregorian, normEnd, normStart]
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
  normEnd: string
): Promise<CreateBookingResult> {
  const parsedDate = parseGregorianDateKey(input.date_gregorian);
  const jalali = gregorianToJalali(parsedDate);
  const jalaliDate = `${jalali.jy}/${String(jalali.jm).padStart(2, "0")}/${String(jalali.jd).padStart(2, "0")}`;

  const result = await client.query(
    `INSERT INTO bookings (
      user_id, customer_phone, customer_name, service_id,
      selected_addons, date, date_gregorian, start_time, end_time,
      status, phone_verified, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, ($8 || ':00')::time, ($9 || ':00')::time, 'reserved', true, NOW())
    ON CONFLICT (date_gregorian, start_time, end_time)
    WHERE status IN ('reserved', 'confirmed')
    DO NOTHING
    RETURNING id, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
    [
      userId,
      phone,
      input.customer_name || "",
      input.service_id,
      input.selected_addons || [],
      jalaliDate,
      input.date_gregorian,
      normStart,
      normEnd,
    ]
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
  const parsedDate = parseGregorianDateKey(input.date_gregorian);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.date_gregorian) {
    throw createBookingError("INVALID_DATE");
  }

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

    const service = await fetchService(client, input.service_id);
    const [addonsDuration, salonInfo] = await Promise.all([
      fetchAddonsDuration(client, input.selected_addons, service.addonIds),
      fetchSalonInfo(client),
    ]);

    validateEndTimeMatchesService(
      normStart,
      normEnd,
      service.durationMinutes,
      addonsDuration,
      salonInfo
    );

    validateWithinWorkingHours(normStart, normEnd, input.date_gregorian, salonInfo);

    await assertSlotAvailable(client, input.date_gregorian, normStart, normEnd);

    const booking = await insertBooking(
      client,
      input,
      verifiedUserId,
      phone,
      normStart,
      normEnd
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
