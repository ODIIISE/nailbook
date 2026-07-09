import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(_request: NextRequest) {
  try {
    const { rows } = await sql`
      SELECT id, service_id, selected_addons, customer_name, customer_phone,
             date, date_gregorian, start_time, end_time, status, paid,
             phone_verified, created_at
      FROM bookings
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
