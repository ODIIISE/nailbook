import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const b = await request.json();
    await sql`
      INSERT INTO bookings (id, user_id, service_id, selected_addons, customer_name, customer_phone, date, date_gregorian, start_time, end_time, status, phone_verified)
      VALUES (${b.id}, ${b.user_id || null}, ${b.service_id}, ${JSON.stringify(b.selected_addons)}, ${b.customer_name}, ${b.customer_phone}, ${b.date}, ${b.date_gregorian}, ${b.start_time}, ${b.end_time}, ${b.status || 'confirmed'}, ${b.phone_verified ?? true})
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
