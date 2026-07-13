import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { getTehranDateKey } from "@/lib/time";

// Normalize time to HH:MM format (strip seconds if present)
function normalizeTime(t: string): string {
  return t.length > 5 ? t.slice(0, 5) : t;
}

export async function POST(request: NextRequest) {
  let client;
  try {
    const { phone, service_id, date_gregorian, start_time, end_time, customer_name, selected_addons, user_id } =
      await request.json();

    if (!phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Verify customer session if present (optional — booking works without login too)
    const sessionUserId = verifyCustomerSession(request.cookies.get("session")?.value);

    // Normalize times to HH:MM format
    const normStart = normalizeTime(start_time);
    const normEnd = normalizeTime(end_time);

    client = await sql.connect();
    await client.query("BEGIN");

    // Anti-spam check using the same client (avoids pool exhaustion)
    try {
      const todayStr = getTehranDateKey(new Date());
      const { rows: spamRows } = await client.query(
        `SELECT COUNT(*) as count FROM bookings WHERE customer_phone = $1 AND date_gregorian = $2::date AND status IN ('confirmed', 'pending')`,
        [phone, todayStr]
      );
      const todayBookings = parseInt(spamRows[0]?.count || "0");
      if (todayBookings >= 3) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "شما امروز قبلاً ۳ رزرو انجام داده‌اید. لطفاً فردا تلاش کنید." }, { status: 429 });
      }
    } catch (e) {
      console.warn("[BOOK] Anti-spam check failed, allowing booking:", e);
    }

    // Use ::time cast for proper time comparison (not string comparison)
    const conflictCheck = await client.query(
      `SELECT id, customer_name,
              TO_CHAR(start_time, 'HH24:MI') as start_time,
              TO_CHAR(end_time, 'HH24:MI') as end_time
       FROM bookings
       WHERE date_gregorian = $1::date
       AND status = 'confirmed'
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time
       FOR UPDATE`,
      [date_gregorian, normEnd, normStart]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "این زمان قبلاً رزرو شده", conflict: true },
        { status: 409 }
      );
    }

    const blockedCheck = await client.query(
      `SELECT id,
              TO_CHAR(start_time, 'HH24:MI') as start_time,
              TO_CHAR(end_time, 'HH24:MI') as end_time
       FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time < ($2 || ':00')::time
       AND end_time > ($3 || ':00')::time`,
      [date_gregorian, normEnd, normStart]
    );

    if (blockedCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "این زمان مسدود شده", conflict: true },
        { status: 409 }
      );
    }

    const result = await client.query(
      `INSERT INTO bookings (
        user_id, customer_phone, customer_name, service_id,
        selected_addons, date_gregorian, start_time, end_time,
        status, phone_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::date, ($7 || ':00')::time, ($8 || ':00')::time, 'confirmed', true, NOW())
      RETURNING id, TO_CHAR(start_time, 'HH24:MI') as start_time, TO_CHAR(end_time, 'HH24:MI') as end_time`,
      [
        sessionUserId,
        phone,
        customer_name || "",
        service_id,
        JSON.stringify(selected_addons || []),
        date_gregorian,
        normStart,
        normEnd,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Booking confirmed",
      booking_id: result.rows[0].id,
      start_time: result.rows[0].start_time,
      end_time: result.rows[0].end_time,
    });
  } catch (error: any) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch {}
    }

    if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
      return NextResponse.json(
        { error: "این زمان همین الان رزرو شد. لطفاً زمان دیگری را انتخاب کنید." },
        { status: 409 }
      );
    }

    console.error("[BOOK] Failed:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
      stack: error?.stack?.split("\n").slice(0, 3),
    });
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
