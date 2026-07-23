import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const date = searchParams.get("date") || "";

    let query;
    if (status && date) {
      query = sql`
        SELECT id, customer_name, customer_phone, service_id, date_gregorian,
               start_time, end_time, status, paid, phone_verified, created_at
        FROM bookings
        WHERE salon_id = ${id} AND status = ${status} AND date_gregorian = ${date}::date
        ORDER BY start_time ASC
        LIMIT 200
      `;
    } else if (status) {
      query = sql`
        SELECT id, customer_name, customer_phone, service_id, date_gregorian,
               start_time, end_time, status, paid, phone_verified, created_at
        FROM bookings
        WHERE salon_id = ${id} AND status = ${status}
        ORDER BY date_gregorian DESC, start_time ASC
        LIMIT 200
      `;
    } else if (date) {
      query = sql`
        SELECT id, customer_name, customer_phone, service_id, date_gregorian,
               start_time, end_time, status, paid, phone_verified, created_at
        FROM bookings
        WHERE salon_id = ${id} AND date_gregorian = ${date}::date
        ORDER BY start_time ASC
        LIMIT 200
      `;
    } else {
      query = sql`
        SELECT id, customer_name, customer_phone, service_id, date_gregorian,
               start_time, end_time, status, paid, phone_verified, created_at
        FROM bookings
        WHERE salon_id = ${id}
        ORDER BY date_gregorian DESC, start_time ASC
        LIMIT 200
      `;
    }

    const { rows } = await query;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
