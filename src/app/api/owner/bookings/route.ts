import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyStaff } from "@/lib/owner-auth";
import { normalizeDigits } from "@/lib/digits";
import { logActivity } from "@/lib/db/activity-log";
import { resolveSalonId } from "@/lib/multi-tenant";
import { parseGregorianDateKey } from "@/lib/time";
import { resolveSlotInterval, resolveSlotBuffer } from "@/lib/salon-settings";

/** "HH:MM" (or "H:MM") → minutes since midnight. Numeric comparison is
 * required: string ordering mis-sorts single-digit hours ("10:00" < "9:00"). */
function toMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** artist_id / note (migrations 025/026) are absent until the runner applies
 *  them. Returns the subset that exists so writes omit the rest instead of
 *  500ing on pre-migration databases. */
async function existingBookingExtras(): Promise<Set<string>> {
  try {
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'bookings'
       AND column_name IN ('artist_id', 'note')`
    );
    return new Set(rows.map((r) => String(r.column_name)));
  } catch {
    return new Set();
  }
}

/** True iff the user exists in this salon and carries the artist role.
 *  Runs outside the booking transaction; falls back to existence-only on
 *  pre-014 schemas without the roles column. */
async function isSalonArtist(artistId: string, salonId: string | null): Promise<boolean> {
  try {
    const { rows } = salonId
      ? await sql.query(`SELECT roles FROM users WHERE id = $1 AND salon_id = $2 LIMIT 1`, [artistId, salonId])
      : await sql.query(`SELECT roles FROM users WHERE id = $1 LIMIT 1`, [artistId]);
    if (!rows[0]) return false;
    const roles = rows[0].roles;
    if (Array.isArray(roles)) return roles.includes("artist");
    if (typeof roles === "string") return /\bartist\b/.test(roles);
    return false;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const message = String((error as { message?: string })?.message || "");
    if (code !== "42703" && !/column .* does not exist/i.test(message)) throw error;
    const { rows } = salonId
      ? await sql.query(`SELECT id FROM users WHERE id = $1 AND salon_id = $2 LIMIT 1`, [artistId, salonId])
      : await sql.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [artistId]);
    return rows.length > 0;
  }
}

/**
 * POST /api/owner/bookings
 *
 * Creates a manual booking on behalf of a customer.
 * Unlike /api/book (customer-facing), this endpoint:
 * - Skips anti-spam checks
 * - Applies the salon's duration, buffer, working-hours, and block rules
 * - Skips only customer anti-spam requirements
 * - Checks conflicts transactionally
 * - Auto-creates a user if the phone is new
 */
export async function POST(request: NextRequest) {
  let client;
  try {
    const staff = await verifyStaff(request, "bookings.manage");
    if (!staff) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const body = await request.json();
    const { customer_name, customer_phone, service_id, date, date_gregorian, start_time, end_time } = body;
    const selectedAddonIds: string[] = Array.isArray(body.selected_addons)
      ? body.selected_addons.filter((id: unknown): id is string => typeof id === "string")
      : [];
    // Artist assignment + internal note (migrations 025/026). Both optional;
    // absent keeps the legacy unassigned / empty-note behavior.
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";
    let artistId: string | null = null;
    if (body.artist_id !== undefined && body.artist_id !== null && body.artist_id !== "") {
      artistId = String(body.artist_id);
      if (!UUID_RE.test(artistId)) {
        return NextResponse.json({ error: "هنرمند یافت نشد" }, { status: 400 });
      }
    }

    if (!customer_phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const phone = normalizeDigits(String(customer_phone).trim());
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    const normStart = start_time.slice(0, 5);
    const normEnd = end_time.slice(0, 5);

    // Compare numerically — string compare rejects valid single-digit-hour
    // ranges ("10:00" sorts before "9:00").
    if (toMinutes(normEnd) <= toMinutes(normStart)) {
      return NextResponse.json({ error: "ساعت پایان باید بعد از ساعت شروع باشد" }, { status: 400 });
    }

    // Validate the date before it reaches Postgres ::date casts (garbage
    // previously surfaced as an unhandled 500).
    const parsedDate = parseGregorianDateKey(String(date_gregorian));
    if (
      !Number.isFinite(parsedDate.getTime())
      || parsedDate.toISOString().slice(0, 10) !== String(date_gregorian)
    ) {
      return NextResponse.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
    }

    // Validate service exists
    const salonId = await resolveSalonId();
    const serviceResult = salonId
      ? await sql.query("SELECT id, addon_ids, duration_minutes, name, price FROM services WHERE id = $1 AND salon_id = $2 AND is_active = true", [service_id, salonId])
      : await sql`SELECT id, addon_ids, duration_minutes FROM services WHERE id = ${service_id} AND is_active = true`;
    const svcRows = serviceResult.rows;
    if (svcRows.length === 0) {
      return NextResponse.json({ error: "سرویس یافت نشد" }, { status: 400 });
    }
    const allowedAddonIds = new Set<string>((svcRows[0]?.addon_ids || []).map((id: unknown) => String(id)));
    if (selectedAddonIds.some((id) => !allowedAddonIds.has(id))) {
      return NextResponse.json({ error: "آپشن انتخاب‌شده برای این سرویس معتبر نیست" }, { status: 400 });
    }
    if (selectedAddonIds.length > 0) {
      const addonResult = salonId
        ? await sql.query(
            "SELECT id FROM addons WHERE id = ANY($1) AND salon_id = $2 AND is_active = true",
            [selectedAddonIds, salonId]
          )
        : await sql.query("SELECT id FROM addons WHERE id = ANY($1) AND is_active = true", [selectedAddonIds]);
      if (addonResult.rows.length !== selectedAddonIds.length) {
        return NextResponse.json({ error: "آپشن انتخاب‌شده یافت نشد" }, { status: 400 });
      }
    }
    if (artistId && !(await isSalonArtist(artistId, salonId))) {
      return NextResponse.json({ error: "هنرمند یافت نشد" }, { status: 400 });
    }
    // Manual bookings use the same salon schedule constraints as customer
    // bookings; only anti-spam/auth requirements differ.
    const settingsResult = salonId
      ? await sql.query(
          "SELECT working_hours, specific_days_off, allow_overflow, overflow_minutes, slot_buffer_minutes, slot_interval_minutes FROM salons WHERE id = $1",
          [salonId]
        )
      : await sql`SELECT working_hours, specific_days_off, allow_overflow, overflow_minutes, slot_buffer_minutes, slot_interval_minutes FROM salon_info LIMIT 1`;
    const settings = settingsResult.rows[0] || {};
    const addonDurationResult = selectedAddonIds.length > 0
      ? salonId
        ? await sql.query("SELECT duration_minutes, price FROM addons WHERE id = ANY($1) AND salon_id = $2 AND is_active = true", [selectedAddonIds, salonId])
        : await sql.query("SELECT duration_minutes, price FROM addons WHERE id = ANY($1) AND is_active = true", [selectedAddonIds])
      : { rows: [] as Array<{ duration_minutes: number | string; price?: number | string }> };
    const rawDuration = Number(svcRows[0].duration_minutes || 0)
      + addonDurationResult.rows.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
    // Price snapshot: what this manual booking was worth at creation time.
    const priceTotal = Number(svcRows[0].price || 0)
      + addonDurationResult.rows.reduce((sum, row) => sum + Number(row.price || 0), 0);
    const serviceName = String(svcRows[0].name || "");
    // Shared clamps — the customer engine clamps the same settings the same
    // way, so owner and customer bookings can never disagree on durations.
    const interval = resolveSlotInterval(settings.slot_interval_minutes);
    const buffer = resolveSlotBuffer(settings.slot_buffer_minutes);
    const expectedDuration = Math.ceil((rawDuration + buffer) / interval) * interval;
    const startMinutes = toMinutes(normStart);
    const endMinutes = toMinutes(normEnd);
    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes - startMinutes !== expectedDuration) {
      return NextResponse.json({ error: "مدت زمان با تنظیمات سالن مطابقت ندارد" }, { status: 400 });
    }
    const dayOffs = Array.isArray(settings.specific_days_off) ? settings.specific_days_off : [];
    if (dayOffs.includes(date_gregorian)) {
      return NextResponse.json({ error: "این روز تعطیل است" }, { status: 409 });
    }
    const dateParts = date_gregorian.split("-").map(Number);
    const weekday = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 12)).getUTCDay();
    const dayKeys = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
    const dayHours = settings.working_hours?.[dayKeys[weekday === 6 ? 0 : weekday + 1]];
    if (dayHours) {
      const hardClose = toMinutes(dayHours.close) + (settings.allow_overflow ? Number(settings.overflow_minutes || 0) : 0);
      if (startMinutes < toMinutes(dayHours.open) || endMinutes > hardClose) {
        return NextResponse.json({ error: "ساعت خارج از ساعات کاری است" }, { status: 409 });
      }
    } else if (settings.working_hours) {
      return NextResponse.json({ error: "این روز تعطیل است" }, { status: 409 });
    }

    client = await sql.connect();
    await client.query("BEGIN");

    // Serialize all booking attempts for this tenant/day. The overlap query
    // below then protects against concurrent owner/customer requests.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${salonId ?? "legacy"}:${date_gregorian}`]
    );

    // Ensure user exists (create placeholder if not)
    let userId: string | null = null;
    const existingUserResult = salonId
      ? await client.query(`SELECT id FROM users WHERE phone = $1 AND salon_id = $2 LIMIT 1`, [phone, salonId])
      : await client.query(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [phone]);
    const existingUser = existingUserResult.rows;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
    } else {
      try {
        const newUserResult = salonId
          ? await client.query(
              `INSERT INTO users (phone, name, role, salon_id) VALUES ($1, $2, 'customer', $3) RETURNING id`,
              [phone, customer_name || "مشتری", salonId]
            )
          : await client.query(
              `INSERT INTO users (phone, name, role) VALUES ($1, $2, 'customer') RETURNING id`,
              [phone, customer_name || "مشتری"]
            );
        userId = newUserResult.rows[0].id;
      } catch (insertError) {
        // A concurrent owner booking (or users-page create) may have inserted
        // the same phone after our SELECT — adopt that row instead of 500ing.
        if ((insertError as { code?: string }).code !== "23505") throw insertError;
        const raced = salonId
          ? await client.query(`SELECT id FROM users WHERE phone = $1 AND salon_id = $2 LIMIT 1`, [phone, salonId])
          : await client.query(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, [phone]);
        if (!raced.rows[0]) throw insertError;
        userId = raced.rows[0].id;
      }
    }

    // Check for time conflicts with existing bookings
    const { rows: conflicts } = await client.query(
      salonId
        ? `SELECT id FROM bookings
       WHERE salon_id = $1 AND date_gregorian = $2::date
       AND status IN ('reserved', 'confirmed', 'in_progress')
       AND start_time < ($3 || ':00')::time
       AND end_time > ($4 || ':00')::time`
        : `SELECT id FROM bookings
       WHERE date_gregorian = $1::date
       AND status IN ('reserved', 'confirmed', 'in_progress')
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      salonId ? [salonId, date_gregorian, normEnd, normStart] : [date_gregorian, normEnd, normStart]
    );

    if (conflicts.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    // Check for blocked times
    const { rows: blocked } = await client.query(
      salonId
        ? `SELECT id FROM blocked_times
       WHERE salon_id = $1 AND date_gregorian = $2::date
       AND start_time < ($3 || ':00')::time
       AND end_time > ($4 || ':00')::time`
        : `SELECT id FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      salonId ? [salonId, date_gregorian, normEnd, normStart] : [date_gregorian, normEnd, normStart]
    );

    if (blocked.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    // Insert the booking
    const jalaliDate = date || date_gregorian;
    // Skip the schema probe on the common path (no artist/note to store).
    const extras = artistId || note ? await existingBookingExtras() : new Set<string>();
    const extraCols: string[] = [];
    const extraVals: unknown[] = [];
    if (artistId && extras.has("artist_id")) {
      extraCols.push("artist_id");
      extraVals.push(artistId);
    }
    if (note && extras.has("note")) {
      extraCols.push("note");
      extraVals.push(note);
    }
    const extraColsSql = extraCols.length ? `, ${extraCols.join(", ")}` : "";
    const insertSql = salonId
      ? `INSERT INTO bookings (
          user_id, salon_id, customer_phone, customer_name, service_id,
          selected_addons, date, date_gregorian, start_time, end_time,
          status, phone_verified, created_at, service_name, price_total${extraColsSql}
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, ($9 || ':00')::time, ($10 || ':00')::time, 'reserved', true, NOW(), $11, $12${extraVals.map((_, i) => `, $${13 + i}`).join("")})`
      : `INSERT INTO bookings (
          user_id, customer_phone, customer_name, service_id,
          selected_addons, date, date_gregorian, start_time, end_time,
          status, phone_verified, created_at, service_name, price_total${extraColsSql}
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, ($8 || ':00')::time, ($9 || ':00')::time, 'reserved', true, NOW(), $10, $11${extraVals.map((_, i) => `, $${12 + i}`).join("")})`;
    const { rows: inserted } = await client.query(
      `${insertSql}
       RETURNING id, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
      salonId
        ? [userId, salonId, phone, customer_name || "", service_id, JSON.stringify(selectedAddonIds), jalaliDate, date_gregorian, normStart, normEnd, serviceName, Math.round(priceTotal), ...extraVals]
        : [userId, phone, customer_name || "", service_id, JSON.stringify(selectedAddonIds), jalaliDate, date_gregorian, normStart, normEnd, serviceName, Math.round(priceTotal), ...extraVals]
    );

    await client.query("COMMIT");

    const booking = inserted[0];

    logActivity({
      eventType: "booking_created",
      entityType: "booking",
      entityId: booking.id,
      description: `مدیر نوبت ${customer_name || phone} را ثبت کرد`,
      metadata: { service_id, date_gregorian, start_time: normStart, end_time: normEnd, phone, manual: true, artist_id: artistId },
    });

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      start_time: booking.start_time,
      end_time: booking.end_time,
    });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    }
    console.error("[OWNER-BOOK] Error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}

/**
 * PATCH /api/owner/bookings
 *
 * Moves an existing booking to a new date/time, preserving its duration.
 * Mirrors the POST validation (day-off, working hours, atomic overlap and
 * block checks, self excluded) so a reschedule can never land where a new
 * booking would be rejected. Only live bookings move — completed/cancelled
 * stay untouched.
 */
export async function PATCH(request: NextRequest) {
  let client;
  try {
    const staff = await verifyStaff(request, "bookings.manage");
    if (!staff) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const body = await request.json();
    const { id, date_gregorian, start_time, end_time } = body;
    if (!id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const normStart = String(start_time).slice(0, 5);
    const normEnd = String(end_time).slice(0, 5);
    if (toMinutes(normEnd) <= toMinutes(normStart)) {
      return NextResponse.json({ error: "ساعت پایان باید بعد از ساعت شروع باشد" }, { status: 400 });
    }

    const parsedDate = parseGregorianDateKey(String(date_gregorian));
    if (
      !Number.isFinite(parsedDate.getTime())
      || parsedDate.toISOString().slice(0, 10) !== String(date_gregorian)
    ) {
      return NextResponse.json({ error: "تاریخ نامعتبر است" }, { status: 400 });
    }

    const salonId = await resolveSalonId();

    // Load the booking to move (service/addons define the expected duration).
    const existingResult = salonId
      ? await sql.query(
          `SELECT id, service_id, selected_addons, status, date_gregorian FROM bookings WHERE id = $1 AND salon_id = $2 LIMIT 1`,
          [id, salonId]
        )
      : await sql.query(`SELECT id, service_id, selected_addons, status, date_gregorian FROM bookings WHERE id = $1 LIMIT 1`, [id]);
    const existing = existingResult.rows[0];
    if (!existing) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }
    if (existing.status === "cancelled" || existing.status === "completed") {
      return NextResponse.json({ error: "این نوبت قابل جابه‌جایی نیست" }, { status: 409 });
    }

    // Same duration math as POST: the move preserves the booked length.
    const settingsResult = salonId
      ? await sql.query(
          "SELECT working_hours, specific_days_off, allow_overflow, overflow_minutes, slot_buffer_minutes, slot_interval_minutes FROM salons WHERE id = $1",
          [salonId]
        )
      : await sql`SELECT working_hours, specific_days_off, allow_overflow, overflow_minutes, slot_buffer_minutes, slot_interval_minutes FROM salon_info LIMIT 1`;
    const settings = settingsResult.rows[0] || {};
    const svcResult = salonId
      ? await sql.query("SELECT duration_minutes FROM services WHERE id = $1 AND salon_id = $2 LIMIT 1", [existing.service_id, salonId])
      : await sql.query("SELECT duration_minutes FROM services WHERE id = $1 LIMIT 1", [existing.service_id]);
    const addonIds: string[] = Array.isArray(existing.selected_addons) ? existing.selected_addons.filter((a: unknown): a is string => typeof a === "string") : [];
    const addonDurationResult = addonIds.length > 0
      ? salonId
        ? await sql.query("SELECT duration_minutes FROM addons WHERE id = ANY($1) AND salon_id = $2", [addonIds, salonId])
        : await sql.query("SELECT duration_minutes FROM addons WHERE id = ANY($1)", [addonIds])
      : { rows: [] as Array<{ duration_minutes: number | string }> };
    const rawDuration = Number(svcResult.rows[0]?.duration_minutes || 0)
      + addonDurationResult.rows.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
    const interval = resolveSlotInterval(settings.slot_interval_minutes);
    const buffer = resolveSlotBuffer(settings.slot_buffer_minutes);
    const expectedDuration = Math.ceil((rawDuration + buffer) / interval) * interval;
    if (toMinutes(normEnd) - toMinutes(normStart) !== expectedDuration) {
      return NextResponse.json({ error: "مدت زمان با تنظیمات سالن مطابقت ندارد" }, { status: 400 });
    }

    const dayOffs = Array.isArray(settings.specific_days_off) ? settings.specific_days_off : [];
    if (dayOffs.includes(date_gregorian)) {
      return NextResponse.json({ error: "این روز تعطیل است" }, { status: 409 });
    }
    const dateParts = date_gregorian.split("-").map(Number);
    const weekday = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 12)).getUTCDay();
    const dayKeys = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
    const dayHours = settings.working_hours?.[dayKeys[weekday === 6 ? 0 : weekday + 1]];
    if (dayHours) {
      const hardClose = toMinutes(dayHours.close) + (settings.allow_overflow ? Number(settings.overflow_minutes || 0) : 0);
      if (toMinutes(normStart) < toMinutes(dayHours.open) || toMinutes(normEnd) > hardClose) {
        return NextResponse.json({ error: "ساعت خارج از ساعات کاری است" }, { status: 409 });
      }
    } else if (settings.working_hours) {
      return NextResponse.json({ error: "این روز تعطیل است" }, { status: 409 });
    }

    client = await sql.connect();
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [`${salonId ?? "legacy"}:${date_gregorian}`]
    );

    // Lock the row first: a concurrent status change (cancel/complete) racing
    // this move must serialize rather than silently move a dead booking.
    const lockedResult = salonId
      ? await client.query(`SELECT id, status FROM bookings WHERE id = $1 AND salon_id = $2 FOR UPDATE`, [id, salonId])
      : await client.query(`SELECT id, status FROM bookings WHERE id = $1 FOR UPDATE`, [id]);
    const locked = lockedResult.rows[0];
    if (!locked) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }
    if (locked.status === "cancelled" || locked.status === "completed") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این نوبت قابل جابه‌جایی نیست" }, { status: 409 });
    }

    const { rows: conflicts } = await client.query(
      salonId
        ? `SELECT id FROM bookings
       WHERE salon_id = $1 AND date_gregorian = $2::date
       AND status IN ('reserved', 'confirmed', 'in_progress')
       AND id <> $5
       AND start_time < ($3 || ':00')::time
       AND end_time > ($4 || ':00')::time`
        : `SELECT id FROM bookings
       WHERE date_gregorian = $1::date
       AND status IN ('reserved', 'confirmed', 'in_progress')
       AND id <> $4
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      salonId ? [salonId, date_gregorian, normEnd, normStart, id] : [date_gregorian, normEnd, normStart, id]
    );
    if (conflicts.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    const { rows: blocked } = await client.query(
      salonId
        ? `SELECT id FROM blocked_times
       WHERE salon_id = $1 AND date_gregorian = $2::date
       AND start_time < ($3 || ':00')::time
       AND end_time > ($4 || ':00')::time`
        : `SELECT id FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      salonId ? [salonId, date_gregorian, normEnd, normStart] : [date_gregorian, normEnd, normStart]
    );
    if (blocked.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    const { rows: updated } = await client.query(
      salonId
        ? `UPDATE bookings SET date_gregorian = $2::date, date = $2, start_time = ($3 || ':00')::time, end_time = ($4 || ':00')::time
           WHERE id = $1 AND salon_id = $5
           RETURNING id, TO_CHAR(date_gregorian, 'YYYY-MM-DD') as date_gregorian, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`
        : `UPDATE bookings SET date_gregorian = $2::date, date = $2, start_time = ($3 || ':00')::time, end_time = ($4 || ':00')::time
           WHERE id = $1
           RETURNING id, TO_CHAR(date_gregorian, 'YYYY-MM-DD') as date_gregorian, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
      salonId ? [id, date_gregorian, normStart, normEnd, salonId] : [id, date_gregorian, normStart, normEnd]
    );

    await client.query("COMMIT");

    logActivity({
      eventType: "booking_rescheduled",
      entityType: "booking",
      entityId: id,
      description: `مدیر نوبت را به ${date_gregorian} ${normStart} منتقل کرد`,
      metadata: { date_gregorian, start_time: normStart, end_time: normEnd },
    });

    const moved = updated[0];
    return NextResponse.json({
      success: true,
      booking_id: moved.id,
      date_gregorian: moved.date_gregorian,
      start_time: moved.start_time,
      end_time: moved.end_time,
    });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    }
    console.error("[OWNER-RESCHED] Error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
