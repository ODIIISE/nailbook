import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { logActivity } from "@/lib/db/activity-log";
import { checkAntiSpam } from "@/lib/anti-spam";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { normalizeDigits } from "@/lib/digits";

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    let { phone, service_id, date_gregorian, start_time, end_time, customer_name, selected_addons, user_id } = body;

    // Step 0: Verify customer session — always prefer server-verified identity
    const sessionCookie = request.cookies.get("session")?.value;
    if (sessionCookie) {
      const sessionUserId = verifyCustomerSession(sessionCookie);
      if (sessionUserId) {
        user_id = sessionUserId;
      }
    }
    // Never trust user-supplied user_id — always null for unauthenticated bookings
    if (!sessionCookie || !user_id) {
      user_id = null;
    }

    // Step 1: Normalize phone server-side (prevents anti-spam bypass via character encoding)
    if (phone) phone = normalizeDigits(String(phone).trim());

    // Step 2: Validate input
    if (!phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Validate phone format
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    // Validate customer name length
    if (customer_name && customer_name.length > 100) {
      customer_name = customer_name.slice(0, 100);
    }

    // Step 3: Normalize times to HH:MM
    const normStart = start_time.length > 5 ? start_time.slice(0, 5) : start_time;
    const normEnd = end_time.length > 5 ? end_time.slice(0, 5) : end_time;

    // Step 4: Validate end_time doesn't exceed 23:59
    if (normEnd >= "24:00") {
      return NextResponse.json({ error: "ساعت پایان نامعتبر است" }, { status: 400 });
    }

    // Step 5: Validate end_time > start_time
    if (normEnd <= normStart) {
      return NextResponse.json({ error: "ساعت پایان باید بعد از ساعت شروع باشد" }, { status: 400 });
    }

    // Step 6: Anti-spam check
    const spamCheck = await checkAntiSpam(phone);
    if (!spamCheck.allowed) {
      return NextResponse.json({ error: spamCheck.error }, { status: 429 });
    }

    // Step 7: Connect and begin transaction
    client = await sql.connect();
    await client.query("BEGIN");

    // Step 8: Validate end_time matches service duration + addons + buffer
    const { rows: serviceRows } = await client.query(
      `SELECT duration_minutes FROM services WHERE id = $1`,
      [service_id]
    );
    if (serviceRows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "سرویس یافت نشد" }, { status: 400 });
    }
    const serviceDuration = Number(serviceRows[0].duration_minutes);

    // Fetch and validate addons
    let addonsDuration = 0;
    if (selected_addons && selected_addons.length > 0) {
      const { rows: addonRows } = await client.query(
        `SELECT id, duration_minutes FROM addons WHERE id = ANY($1) AND is_active = true`,
        [selected_addons]
      );
      // If some addon IDs were not found or inactive, reject
      if (addonRows.length !== selected_addons.length) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "آپشن نامعتبر" }, { status: 400 });
      }
      addonsDuration = addonRows.reduce((sum: number, r: any) => sum + Number(r.duration_minutes || 0), 0);
    }

    // Fetch salon buffer and interval
    const { rows: salonRows } = await client.query(`SELECT slot_buffer_minutes, slot_interval_minutes FROM salon_info LIMIT 1`);
    const buffer = Number(salonRows[0]?.slot_buffer_minutes || 0);
    const resolution = Number(salonRows[0]?.slot_interval_minutes || 15);

    const rawDuration = serviceDuration + addonsDuration;
    const expectedMinutes = buffer > 0
      ? Math.ceil((rawDuration + buffer) / resolution) * resolution
      : Math.ceil(rawDuration / resolution) * resolution;

    const [sH, sM] = normStart.split(":").map(Number);
    const expectedEndMinutes = sH * 60 + sM + expectedMinutes;
    const expectedEnd = `${String(Math.floor(expectedEndMinutes / 60)).padStart(2, "0")}:${String(expectedEndMinutes % 60).padStart(2, "0")}`;

    if (normEnd !== expectedEnd) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "مدت زمان سرویس با زمان انتخابی مطابقت ندارد" }, { status: 400 });
    }

    // Step 8b: Validate booking is within working hours and not on a day off
    const { rows: salonFullRows } = await client.query(
      `SELECT working_hours, specific_days_off FROM salon_info LIMIT 1`
    );
    if (salonFullRows[0]) {
      // Check specific days off
      const daysOff = salonFullRows[0].specific_days_off;
      if (Array.isArray(daysOff) && daysOff.includes(date_gregorian)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "این روز تعطیل است", conflict: true }, { status: 409 });
      }

      // Check working hours for the booking's day of week
      const workingHours = salonFullRows[0].working_hours;
      if (workingHours && typeof workingHours === "object") {
        // Determine day of week from date_gregorian (YYYY-MM-DD)
        const [y, m, d] = date_gregorian.split("-").map(Number);
        const jsDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        const jsDay = jsDate.getDay();
        const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const iranDay = dayMap[jsDay === 6 ? 0 : jsDay + 1]; // JS 0=Sun → Iran "sun", etc.
        const dayHours = workingHours[iranDay];

        if (!dayHours) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "سالن در این روز تعطیل است", conflict: true }, { status: 409 });
        }

        // Validate start_time >= open and end_time <= close (with overflow allowance)
        const openMinutes = parseInt(dayHours.open.split(":")[0]) * 60 + parseInt(dayHours.open.split(":")[1]);
        const closeMinutes = parseInt(dayHours.close.split(":")[0]) * 60 + parseInt(dayHours.close.split(":")[1]);
        const startMinutes = sH * 60 + sM;
        const endMinutes = expectedEndMinutes;

        // Allow overflow up to overflow_minutes past closing
        const { rows: overflowRows } = await client.query(
          `SELECT allow_overflow, overflow_minutes FROM salon_info LIMIT 1`
        );
        const allowOverflow = overflowRows[0]?.allow_overflow ?? false;
        const overflowMinutes = overflowRows[0]?.overflow_minutes ?? 0;
        const hardEndLimit = closeMinutes + (allowOverflow ? overflowMinutes : 0);

        if (startMinutes < openMinutes || endMinutes > hardEndLimit) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "ساعت رزرو خارج از ساعات کاری است", conflict: true }, { status: 409 });
        }
      }
    }

    // Step 9: Atomic INSERT with ON CONFLICT — eliminates TOCTOU race condition
    // The unique index idx_bookings_no_overlap covers (date_gregorian, start_time, end_time)
    // for both 'reserved' and 'confirmed' statuses, so concurrent requests will conflict at DB level
    const jalaliDate = body.date || date_gregorian;
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
        user_id || null,
        phone,
        customer_name || "",
        service_id,
        JSON.stringify(selected_addons || []),
        jalaliDate,
        date_gregorian,
        normStart,
        normEnd,
      ]
    );

    // If INSERT returned no rows, the conflict was caught by the unique index
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    // Step 10: Check blocked times (after insert to minimize race window)
    const blockedCheck = await client.query(
      `SELECT id FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      [date_gregorian, normEnd, normStart]
    );

    if (blockedCheck.rows.length > 0) {
      // ROLLBACK undoes the preceding INSERT within the same transaction
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    // Step 11: Commit
    await client.query("COMMIT");

    // Log the booking creation
    logActivity({
      eventType: "booking_created",
      entityType: "booking",
      entityId: result.rows[0].id,
      description: `${customer_name || "مشتری"} نوبت جدید رزرو کرد`,
      metadata: { service_id, date_gregorian, start_time: normStart, end_time: normEnd, phone },
    });

    return NextResponse.json({
      success: true,
      booking_id: result.rows[0].id,
      start_time: result.rows[0].start_time,
      end_time: result.rows[0].end_time,
    });
  } catch (error: any) {
    // Rollback on error
    if (client) {
      try { await client.query("ROLLBACK"); } catch (rbError) { console.error("ROLLBACK failed:", rbError); }
    }

    // Log error without sensitive details
    console.error("[BOOK] Error:", error?.code || "unknown");

    // Handle unique constraint violation (defense in depth — ON CONFLICT should catch this first)
    if (error?.code === "23505") {
      return NextResponse.json({ error: "این زمان همین الان رزرو شد", conflict: true }, { status: 409 });
    }

    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
