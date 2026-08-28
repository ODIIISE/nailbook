import { sql, VercelPoolClient } from "@vercel/postgres";
import { logActivity } from "@/lib/db/activity-log";
import { checkAntiSpam } from "@/lib/anti-spam";
import { BookingError, createBookingError } from "./errors";
import { gregorianToJalali } from "@/lib/jalali";
import { parseGregorianDateKey, getTehranNow } from "@/lib/time";
import type { BookingRequestInput } from "./schema";
import { resolveSalonId } from "@/lib/multi-tenant";

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

async function fetchService(
  client: VercelPoolClient,
  serviceId: string,
  salonId: string | null
): Promise<{ durationMinutes: number; addonIds: string[]; name: string; price: number }> {
  const result = salonId
    ? await client.query(
        `SELECT duration_minutes, addon_ids, name, price FROM services WHERE id = $1 AND salon_id = $2 AND is_active = true`,
        [serviceId, salonId]
      )
    : await client.query(
        `SELECT duration_minutes, addon_ids, name, price FROM services WHERE id = $1 AND is_active = true`,
        [serviceId]
      );
  const { rows } = result;
  if (rows.length === 0) {
    throw createBookingError("SERVICE_NOT_FOUND");
  }
  const rawAddonIds = rows[0].addon_ids;
  const addonIds = Array.isArray(rawAddonIds)
    ? rawAddonIds.filter((id: unknown): id is string => typeof id === "string")
    : typeof rawAddonIds === "string"
      ? rawAddonIds.replace(/^\{|\}$/g, "").split(",").map((id: string) => id.replace(/^"|"$/g, "").trim()).filter(Boolean)
      : [];
  return {
    durationMinutes: Number(rows[0].duration_minutes),
    addonIds,
    name: String(rows[0].name || ""),
    price: Number(rows[0].price || 0),
  };
}

async function fetchAddonsDuration(
  client: VercelPoolClient,
  selectedAddons: string[],
  allowedAddonIds: string[],
  salonId: string | null
): Promise<{ durationMinutes: number; priceTotal: number }> {
  if (selectedAddons.length === 0) return { durationMinutes: 0, priceTotal: 0 };
  if (selectedAddons.some((id) => !allowedAddonIds.includes(id))) {
    throw createBookingError("INVALID_ADDONS");
  }

  const addonResult = salonId
    ? await client.query(
        `SELECT id, duration_minutes, price FROM addons WHERE id = ANY($1) AND salon_id = $2 AND is_active = true`,
        [selectedAddons, salonId]
      )
    : await client.query(
        `SELECT id, duration_minutes, price FROM addons WHERE id = ANY($1) AND is_active = true`,
        [selectedAddons]
      );
  const { rows: addonRows } = addonResult;

  if (addonRows.length !== selectedAddons.length) {
    throw createBookingError("INVALID_ADDONS");
  }

  return addonRows.reduce(
    (acc: { durationMinutes: number; priceTotal: number }, r: { duration_minutes?: string | number; price?: string | number }) => ({
      durationMinutes: acc.durationMinutes + Number(r.duration_minutes || 0),
      priceTotal: acc.priceTotal + Number(r.price || 0),
    }),
    { durationMinutes: 0, priceTotal: 0 }
  );
}

async function fetchSalonInfo(client: VercelPoolClient): Promise<SalonInfo> {
  const salonId = await resolveSalonId();
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
  const buffer = Math.max(0, Number(salonInfo.slot_buffer_minutes) || 0);
  const configuredResolution = Number(salonInfo.slot_interval_minutes);
  const resolution = Number.isFinite(configuredResolution) && configuredResolution >= 5 && configuredResolution <= 60
    ? configuredResolution
    : 15;

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
  normEnd: string,
  salonId: string | null
): Promise<void> {
  // Serialize all booking attempts for this tenant/day before checking
  // intervals. The unique index protects only identical start/end pairs;
  // this lock also closes the race for partially overlapping intervals.
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
    [`${salonId ?? "legacy"}:${dateGregorian}`]
  );

  const bookedCheck = await client.query(
    salonId
      ? `SELECT id FROM bookings
         WHERE salon_id = $1 AND date_gregorian = $2::date
         AND status IN ('reserved', 'confirmed', 'in_progress')
         AND start_time < ($3 || ':00')::time
         AND end_time > ($4 || ':00')::time
         LIMIT 1
         FOR UPDATE`
      : `SELECT id FROM bookings
         WHERE date_gregorian = $1::date
         AND status IN ('reserved', 'confirmed', 'in_progress')
         AND start_time < ($2 || ':00')::time
         AND end_time > ($3 || ':00')::time
         LIMIT 1
         FOR UPDATE`,
    salonId
      ? [salonId, dateGregorian, normEnd, normStart]
      : [dateGregorian, normEnd, normStart]
  );

  if (bookedCheck.rows.length > 0) {
    throw createBookingError("SLOT_TAKEN");
  }

  const blockedCheck = await client.query(
    salonId
      ? `SELECT id FROM blocked_times
         WHERE salon_id = $1 AND date_gregorian = $2::date
         AND start_time < ($3 || ':00')::time
         AND end_time > ($4 || ':00')::time
         LIMIT 1
         FOR UPDATE`
      : `SELECT id FROM blocked_times
         WHERE date_gregorian = $1::date
         AND start_time < ($2 || ':00')::time
         AND end_time > ($3 || ':00')::time
         LIMIT 1
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
  salonId: string | null,
  serviceName: string,
  priceTotal: number
): Promise<CreateBookingResult> {
  const parsedDate = parseGregorianDateKey(input.date_gregorian);
  const jalali = gregorianToJalali(parsedDate);
  const jalaliDate = `${jalali.jy}/${String(jalali.jm).padStart(2, "0")}/${String(jalali.jd).padStart(2, "0")}`;

  const insertSql = salonId
    ? `INSERT INTO bookings (
        user_id, salon_id, customer_phone, customer_name, service_id,
        selected_addons, date, date_gregorian, start_time, end_time,
        status, phone_verified, created_at, service_name, price_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, ($9 || ':00')::time, ($10 || ':00')::time, 'reserved', true, NOW(), $11, $12)`
    : `INSERT INTO bookings (
        user_id, customer_phone, customer_name, service_id,
        selected_addons, date, date_gregorian, start_time, end_time,
        status, phone_verified, created_at, service_name, price_total
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, ($8 || ':00')::time, ($9 || ':00')::time, 'reserved', true, NOW(), $10, $11)`;
  const result = await client.query(
    `${insertSql}
     ON CONFLICT DO NOTHING
     RETURNING id, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
    salonId
      ? [userId, salonId, phone, input.customer_name || "", input.service_id, JSON.stringify(input.selected_addons || []), jalaliDate, input.date_gregorian, normStart, normEnd, serviceName, Math.round(priceTotal)]
      : [userId, phone, input.customer_name || "", input.service_id, JSON.stringify(input.selected_addons || []), jalaliDate, input.date_gregorian, normStart, normEnd, serviceName, Math.round(priceTotal)]
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

  // Compare minutes numerically: the schema allows a single-digit hour
  // ("9:30"), where string ordering would call a valid 9:00→10:00 booking
  // an invalid range ("10:00" sorts before "9:00").
  if (parseMinutes(normEnd) >= 24 * 60) {
    throw createBookingError("TIME_INVALID");
  }

  if (parseMinutes(normEnd) <= parseMinutes(normStart)) {
    throw createBookingError("TIME_RANGE_INVALID");
  }

  // Server-side past-time rejection (spec §9). The client filters past slots
  // using the device clock; this is the authoritative check. Compare minutes
  // numerically since the schema permits a single-digit hour ("9:30").
  const tehranNow = getTehranNow();
  if (
    input.date_gregorian < tehranNow.dateKey
    || (input.date_gregorian === tehranNow.dateKey && parseMinutes(normStart) < tehranNow.minutes)
  ) {
    throw createBookingError("TIME_IN_PAST");
  }

  // Resolve the canonical tenant UUID once — every query and the advisory
  // lock key below must use the same value (SALON_ID may be a legacy slug).
  const salonId = await resolveSalonId();

  const spamCheck = await checkAntiSpam(phone, salonId);
  if (!spamCheck.allowed) {
    throw createBookingError("SPAM_DETECTED", spamCheck.error);
  }

  const client = await sql.connect();

  try {
    await client.query("BEGIN");

    const service = await fetchService(client, input.service_id, salonId);
    const [addons, salonInfo] = await Promise.all([
      fetchAddonsDuration(client, input.selected_addons, service.addonIds, salonId),
      fetchSalonInfo(client),
    ]);
    const addonsDuration = addons.durationMinutes;
    // Snapshot what the customer agreed to at booking time — later price
    // edits or service deletion must not rewrite history.
    const priceTotal = service.price + addons.priceTotal;
    const serviceName = service.name;

    validateEndTimeMatchesService(
      normStart,
      normEnd,
      service.durationMinutes,
      addonsDuration,
      salonInfo
    );

    validateWithinWorkingHours(normStart, normEnd, input.date_gregorian, salonInfo);

    await assertSlotAvailable(client, input.date_gregorian, normStart, normEnd, salonId);

    const booking = await insertBooking(
      client,
      input,
      verifiedUserId,
      phone,
      normStart,
      normEnd,
      salonId,
      serviceName,
      priceTotal
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
