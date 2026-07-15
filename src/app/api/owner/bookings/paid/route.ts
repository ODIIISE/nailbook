import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { bookingId, paid } = await request.json();
    if (!bookingId || typeof paid !== "boolean") {
      return NextResponse.json({ error: "داده ناقص" }, { status: 400 });
    }

    // Get booking info for logging
    const { rows: booking } = await sql`SELECT customer_name, customer_phone FROM bookings WHERE id = ${bookingId}`;

    await sql`UPDATE bookings SET paid = ${paid} WHERE id = ${bookingId}`;

    logActivity({
      eventType: paid ? "payment_received" : "payment_reverted",
      entityType: "booking",
      entityId: bookingId,
      description: paid
        ? `پرداخت نوبت ${booking[0]?.customer_name || booking[0]?.customer_phone || ""} ثبت شد`
        : `پرداخت نوبت ${booking[0]?.customer_name || booking[0]?.customer_phone || ""} لغو شد`,
      metadata: { bookingId, paid, customer_name: booking[0]?.customer_name, customer_phone: booking[0]?.customer_phone },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update paid error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
