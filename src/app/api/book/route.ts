import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  let client;
  try {
    const { phone, service_id, date_gregorian, start_time, end_time, customer_name, selected_addons, user_id } =
      await request.json();

    if (!phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    client = await sql.connect();
    await client.query("BEGIN");

    const conflictCheck = await client.query(
      `SELECT id FROM bookings
       WHERE date_gregorian = $1::date
       AND status = 'confirmed'
       AND start_time <= $2
       AND end_time >= $3
       FOR UPDATE`,
      [date_gregorian, end_time, start_time]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "این زمان قبلاً رزرو شده", conflict: true },
        { status: 409 }
      );
    }

    const blockedCheck = await client.query(
      `SELECT id FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time <= $2
       AND end_time >= $3`,
      [date_gregorian, end_time, start_time]
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
      ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, 'confirmed', true, NOW())
      RETURNING id`,
      [
        user_id || null,
        phone,
        customer_name || "",
        service_id,
        JSON.stringify(selected_addons || []),
        date_gregorian,
        start_time,
        end_time,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Booking confirmed",
      booking_id: result.rows[0].id,
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

    console.error("Booking failed:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
