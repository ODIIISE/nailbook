import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { bookingId, status } = await request.json();

    if (!bookingId || !status) {
      return NextResponse.json({ error: "داده ناقص" }, { status: 400 });
    }

    const validStatuses = ["pending", "reserved", "confirmed", "in_progress", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "وضعیت نامعتبر" }, { status: 400 });
    }

    await sql`UPDATE bookings SET status = ${status} WHERE id = ${bookingId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update booking status error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
