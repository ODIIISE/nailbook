import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    const { rows } = await sql`
      SELECT id, service_id, selected_addons, customer_name, customer_phone,
             date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
             phone_verified, created_at
      FROM bookings
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
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
