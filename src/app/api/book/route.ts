import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const { phone, service_id, date_gregorian, start_time, end_time, customer_name, selected_addons, user_id } = body;

    // Step 1: Validate input
    if (!phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است", received: { phone: !!phone, service_id: !!service_id, date_gregorian: !!date_gregorian, start_time: !!start_time, end_time: !!end_time } }, { status: 400 });
    }

    // Step 2: Normalize times to HH:MM
    const normStart = start_time.length > 5 ? start_time.slice(0, 5) : start_time;
    const normEnd = end_time.length > 5 ? end_time.slice(0, 5) : end_time;

    // Step 3: Connect and begin transaction
    client = await sql.connect();
    await client.query("BEGIN");

    // Step 4: Check for conflicts using proper TIME comparison
    const conflictCheck = await client.query(
      `SELECT id FROM bookings
       WHERE date_gregorian = $1::date
       AND status IN ('reserved', 'confirmed')
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time
       FOR UPDATE`,
      [date_gregorian, normEnd, normStart]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    // Step 5: Check blocked times
    const blockedCheck = await client.query(
      `SELECT id FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      [date_gregorian, normEnd, normStart]
    );

    if (blockedCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    // Step 6: Insert booking (include Jalali date column)
    const jalaliDate = body.date || date_gregorian;
    const bookingStatus = body.status || "reserved";
    const result = await client.query(
      `INSERT INTO bookings (
        user_id, customer_phone, customer_name, service_id,
        selected_addons, date, date_gregorian, start_time, end_time,
        status, phone_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, ($8 || ':00')::time, ($9 || ':00')::time, $10, true, NOW())
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
        bookingStatus,
      ]
    );

    // Step 7: Commit
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

    // Log the actual error
    console.error("[BOOK] Error:", error?.message, error?.code, error?.detail);

    // Handle unique constraint violation
    if (error?.code === "23505") {
      return NextResponse.json({ error: "این زمان همین الان رزرو شد" }, { status: 409 });
    }

    return NextResponse.json({ error: "خطای سرور: " + (error?.message || "unknown") }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
