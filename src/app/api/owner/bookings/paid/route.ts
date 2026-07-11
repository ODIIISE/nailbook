import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { bookingId, paid } = await request.json();
    if (!bookingId || typeof paid !== "boolean") {
      return NextResponse.json({ error: "داده ناقص" }, { status: 400 });
    }

    await sql`UPDATE bookings SET paid = ${paid} WHERE id = ${bookingId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update paid error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
