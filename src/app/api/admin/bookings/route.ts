import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "500");

    const { rows } = await sql`
      SELECT id, customer_name, customer_phone, date_gregorian,
             start_time, end_time, status, paid, salon_id, created_at
      FROM bookings
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
