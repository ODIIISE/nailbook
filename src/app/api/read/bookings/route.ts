import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

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
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
