import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET(_request: NextRequest) {
  try {
    const { rows } = await sql`
      SELECT id, service_id, selected_addons, customer_name, customer_phone,
             date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
             phone_verified, created_at
      FROM bookings
      ORDER BY created_at DESC
    `;
    // Normalize date_gregorian to YYYY-MM-DD format
    const normalized = rows.map((r) => ({
      ...r,
      date_gregorian: r.date_gregorian ? r.date_gregorian.split("T")[0] : r.date_gregorian,
    }));
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
