import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { bookingId, paid } = await request.json();
    if (!bookingId || typeof paid !== "boolean") {
      return NextResponse.json({ error: "داده ناقص" }, { status: 400 });
    }

    const salonId = getSalonId();
    const bookingResult = salonId
      ? await sql.query("SELECT customer_name, customer_phone FROM bookings WHERE id = $1 AND salon_id = $2", [bookingId, salonId])
      : await sql`SELECT customer_name, customer_phone FROM bookings WHERE id = ${bookingId}`;
    const booking = bookingResult.rows;
    if (!booking[0]) return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });

    if (salonId) {
      await sql.query("UPDATE bookings SET paid = $1 WHERE id = $2 AND salon_id = $3", [paid, bookingId, salonId]);
    } else {
      await sql`UPDATE bookings SET paid = ${paid} WHERE id = ${bookingId}`;
    }

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
