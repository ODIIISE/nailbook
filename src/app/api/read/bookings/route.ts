import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM bookings ORDER BY created_at DESC`;
    return NextResponse.json(rows.map((b) => ({
      id: b.id,
      service_id: b.service_id,
      selected_addons: b.selected_addons || [],
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      date: b.date,
      date_gregorian: b.date_gregorian,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      phone_verified: b.phone_verified,
      paid: b.paid || false,
      created_at: b.created_at,
    })));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
