import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { normalizeDigits } from "@/lib/digits";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";

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
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const body = await request.json();
    const { customer_name, customer_phone, service_id, date, date_gregorian, start_time, end_time } = body;
    const selectedAddonIds: string[] = Array.isArray(body.selected_addons)
      ? body.selected_addons.filter((id: unknown): id is string => typeof id === "string")
      : [];

    if (!customer_phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const phone = normalizeDigits(String(customer_phone).trim());
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    const normStart = start_time.slice(0, 5);
    const normEnd = end_time.slice(0, 5);

    if (normEnd <= normStart) {
      return NextResponse.json({ error: "ساعت پایان باید بعد از ساعت شروع باشد" }, { status: 400 });
    }

    // Validate service exists
    const salonId = getSalonId();
    const serviceResult = salonId
      ? await sql.query("SELECT id, addon_ids, duration_minutes FROM services WHERE id = $1 AND salon_id = $2 AND is_active = true", [service_id, salonId])
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
        ? await sql.query("SELECT duration_minutes FROM addons WHERE id = ANY($1) AND salon_id = $2 AND is_active = true", [selectedAddonIds, salonId])
        : await sql.query("SELECT duration_minutes FROM addons WHERE id = ANY($1) AND is_active = true", [selectedAddonIds])
      : { rows: [] as Array<{ duration_minutes: number | string }> };
    const rawDuration = Number(svcRows[0].duration_minutes || 0)
      + addonDurationResult.rows.reduce((sum, row) => sum + Number(row.duration_minutes || 0), 0);
    const interval = Math.max(1, Number(settings.slot_interval_minutes || 15));
    const buffer = Math.max(0, Number(settings.slot_buffer_minutes || 0));
    const expectedDuration = Math.ceil((rawDuration + buffer) / interval) * interval;
    const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
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
      const newUserResult = salonId
        ? await client.query(
            `INSERT INTO users (phone, name, role, salon_id) VALUES ($1, $2, 'customer', $3) RETURNING id`,
            [phone, customer_name || "مشتری", salonId]
          )
        : await client.query(
            `INSERT INTO users (phone, name, role) VALUES ($1, $2, 'customer') RETURNING id`,
            [phone, customer_name || "مشتری"]
          );
      const newUser = newUserResult.rows;
      userId = newUser[0].id;
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
    const { rows: inserted } = await client.query(
      `${insertSql}
       RETURNING id, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
      salonId
        ? [userId, salonId, phone, customer_name || "", service_id, JSON.stringify(selectedAddonIds), jalaliDate, date_gregorian, normStart, normEnd]
        : [userId, phone, customer_name || "", service_id, JSON.stringify(selectedAddonIds), jalaliDate, date_gregorian, normStart, normEnd]
    );

    await client.query("COMMIT");

    const booking = inserted[0];

    logActivity({
      eventType: "booking_created",
      entityType: "booking",
      entityId: booking.id,
      description: `مدیر نوبت ${customer_name || phone} را ثبت کرد`,
      metadata: { service_id, date_gregorian, start_time: normStart, end_time: normEnd, phone, manual: true },
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
