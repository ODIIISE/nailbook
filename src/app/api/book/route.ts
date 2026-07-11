import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { phone, service_id, date_gregorian, start_time, end_time } = await request.json();

    if (!phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Check for conflicts
    const { rows: conflicts } = await sql`
      SELECT id FROM bookings
      WHERE date_gregorian = ${date_gregorian}::date
      AND status = 'confirmed'
      AND start_time <= ${end_time}
      AND end_time >= ${start_time}
    `;

    if (conflicts.length > 0) {
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    // Check for blocked times
    const { rows: blocked } = await sql`
      SELECT id FROM blocked_times
      WHERE date_gregorian = ${date_gregorian}::date
      AND start_time <= ${end_time}
      AND end_time >= ${start_time}
    `;

    if (blocked.length > 0) {
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    // Insert booking
    const { rows } = await sql`
      INSERT INTO bookings (
        customer_phone, service_id, date_gregorian,
        start_time, end_time, status, created_at
      ) VALUES (
        ${phone}, ${service_id}, ${date_gregorian},
        ${start_time}, ${end_time}, 'confirmed', NOW()
      )
      RETURNING id
    `;

    return NextResponse.json({
      success: true,
      message: "Booking confirmed",
      booking_id: rows[0].id
    });

  } catch (error: any) {
    // Check for Unique Violation Error (Postgres Code 23505)
    if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
      return NextResponse.json(
        { error: "این زمان همین الان رزرو شد. لطفاً زمان دیگری را انتخاب کنید." },
        { status: 409 } // Conflict
      );
    }

    // Log other errors
    console.error("Booking failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
