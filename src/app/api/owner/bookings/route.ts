import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { normalizeDigits } from "@/lib/digits";
import { logActivity } from "@/lib/db/activity-log";
import { gregorianToJalali } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";

/**
 * POST /api/owner/bookings
 *
 * Creates a manual booking on behalf of a customer.
 * Unlike /api/book (customer-facing), this endpoint:
 * - Skips anti-spam checks
 * - Skips duration/slot-math validation
 * - Skips working-hours validation
 * - Still checks for time conflicts and blocked times
 * - Auto-creates a user if the phone is new
 */
export async function POST(request: NextRequest) {
  let client;
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      service_id,
      date_gregorian,
      start_time,
      end_time,
      selected_addons,
    } = body;

    if (!customer_phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const isValidDate =
      typeof date_gregorian === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date_gregorian) &&
      parseGregorianDateKey(date_gregorian).toISOString().slice(0, 10) === date_gregorian;
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
    if (!isValidDate || typeof start_time !== "string" || typeof end_time !== "string" || !timePattern.test(start_time) || !timePattern.test(end_time)) {
      return NextResponse.json({ error: "تاریخ یا ساعت نامعتبر است" }, { status: 400 });
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

    if (selected_addons !== undefined && (!Array.isArray(selected_addons) || !selected_addons.every((id: unknown) => typeof id === "string"))) {
      return NextResponse.json({ error: "آپشن نامعتبر است" }, { status: 400 });
    }
    const requestedAddons = (selected_addons as string[] | undefined) || [];

    // Validate service exists and only accept add-ons assigned to it.
    const { rows: svcRows } = await sql`SELECT id, addon_ids FROM services WHERE id = ${service_id} AND is_active = true`;
    if (svcRows.length === 0) {
      return NextResponse.json({ error: "سرویس یافت نشد" }, { status: 400 });
    }

    const rawAllowedAddonIds = svcRows[0].addon_ids;
    const allowedAddonIds: string[] = Array.isArray(rawAllowedAddonIds)
      ? rawAllowedAddonIds.filter((id: unknown): id is string => typeof id === "string")
      : typeof rawAllowedAddonIds === "string"
        ? rawAllowedAddonIds
            .replace(/^\{|\}$/g, "")
            .split(",")
            .map((id: string) => id.replace(/^"|"$/g, "").trim())
            .filter(Boolean)
        : [];
    if (requestedAddons.some((id) => !allowedAddonIds.includes(id))) {
      return NextResponse.json({ error: "آپشن نامعتبر است" }, { status: 400 });
    }

    client = await sql.connect();
    await client.query("BEGIN");

    // Match the customer flow: every selected add-on must still exist and be
    // active. Checking only the service assignment would allow an owner to
    // persist deleted/inactive add-ons into a new booking.
    if (requestedAddons.length > 0) {
      const { rows: addonRows } = await client.query(
        `SELECT id FROM addons WHERE id = ANY($1) AND is_active = true`,
        [requestedAddons]
      );
      const uniqueRequestedAddons = new Set(requestedAddons);
      if (uniqueRequestedAddons.size !== requestedAddons.length || addonRows.length !== uniqueRequestedAddons.size) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "آپشن نامعتبر است" }, { status: 400 });
      }
    }

    // Serialize every booking mutation for this date. The public booking
    // service uses the same lock, so manual and customer bookings cannot race
    // past the overlap check and double-book the salon.
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [date_gregorian]);

    // Ensure user exists (create placeholder if not)
    let userId: string | null = null;
    const { rows: existingUser } = await client.query(
      `SELECT id FROM users WHERE phone = $1 LIMIT 1`,
      [phone]
    );

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
    } else {
      const { rows: newUser } = await client.query(
        `INSERT INTO users (phone, pin, name, "role") VALUES ($1, '', $2, 'customer') RETURNING id`,
        [phone, customer_name || "مشتری"]
      );
      userId = newUser[0].id;
    }

    // Check for time conflicts with existing bookings
    const { rows: conflicts } = await client.query(
      `SELECT id FROM bookings
       WHERE date_gregorian = $1::date
       AND status IN ('reserved', 'confirmed', 'in_progress')
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      [date_gregorian, normEnd, normStart]
    );

    if (conflicts.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    // Check for blocked times
    const { rows: blocked } = await client.query(
      `SELECT id FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      [date_gregorian, normEnd, normStart]
    );

    if (blocked.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    // Always derive the Jalali display date server-side from the canonical
    // Gregorian date. This prevents malformed/missing client display dates.
    const parsedDate = parseGregorianDateKey(date_gregorian);
    const jalali = gregorianToJalali(parsedDate);
    const jalaliDate = `${jalali.jy}/${String(jalali.jm).padStart(2, "0")}/${String(jalali.jd).padStart(2, "0")}`;
    const { rows: inserted } = await client.query(
      `INSERT INTO bookings (
        user_id, customer_phone, customer_name, service_id,
        selected_addons, date, date_gregorian, start_time, end_time,
        status, phone_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, ($8 || ':00')::time, ($9 || ':00')::time, 'reserved', true, NOW())
      RETURNING id, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
      [
        userId,
        phone,
        customer_name || "",
        service_id,
        requestedAddons,
        jalaliDate,
        date_gregorian,
        normStart,
        normEnd,
      ]
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
