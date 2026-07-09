import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(request: NextRequest) {
  try {
    // Return only data needed for slot validation (no customer PII)
    const { rows } = await sql`
      SELECT service_id, date_gregorian, start_time, end_time, status
      FROM bookings
      WHERE status IN ('confirmed', 'pending')
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
