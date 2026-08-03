import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSalonId } from "@/lib/multi-tenant";

// Normalize time to HH:MM format
function normalizeTime(t: string): string {
  return t.length > 5 ? t.slice(0, 5) : t;
}

export async function POST(request: NextRequest) {
  try {
    const { service_id, date_gregorian, start_time, end_time } = await request.json();

    if (!service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const normStart = normalizeTime(start_time);
    const normEnd = normalizeTime(end_time);

    const salonId = getSalonId();
    const { rows: conflicts } = salonId
      ? await sql.query(
          `SELECT id FROM bookings
           WHERE salon_id = $1 AND date_gregorian = $2::date
           AND status IN ('reserved', 'confirmed')
           AND start_time < ($3 || ':00')::time
           AND end_time > ($4 || ':00')::time`,
          [salonId, date_gregorian, normEnd, normStart]
        )
      : await sql`
          SELECT id FROM bookings
          WHERE date_gregorian = ${date_gregorian}::date
          AND status IN ('reserved', 'confirmed')
          AND start_time < (${normEnd} || ':00')::time
          AND end_time > (${normStart} || ':00')::time
        `;

    if (conflicts.length > 0) {
      return NextResponse.json({ error: "این زمان قبلاً رزرو شده", conflict: true }, { status: 409 });
    }

    const { rows: blocked } = salonId
      ? await sql.query(
          `SELECT id FROM blocked_times
           WHERE salon_id = $1 AND date_gregorian = $2::date
           AND start_time < ($3 || ':00')::time
           AND end_time > ($4 || ':00')::time`,
          [salonId, date_gregorian, normEnd, normStart]
        )
      : await sql`
          SELECT id FROM blocked_times
          WHERE date_gregorian = ${date_gregorian}::date
          AND start_time < (${normEnd} || ':00')::time
          AND end_time > (${normStart} || ':00')::time
        `;

    if (blocked.length > 0) {
      return NextResponse.json({ error: "این زمان مسدود شده", conflict: true }, { status: 409 });
    }

    return NextResponse.json({ available: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
