import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

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

    // Get current status for logging
    const { rows: current } = await sql`SELECT status, customer_name, customer_phone FROM bookings WHERE id = ${bookingId}`;
    const oldStatus = current[0]?.status || "unknown";

    await sql`UPDATE bookings SET status = ${status} WHERE id = ${bookingId}`;

    const statusLabels: Record<string, string> = {
      pending: "در انتظار",
      reserved: "رزرو شده",
      confirmed: "تایید شده",
      in_progress: "در حال انجام",
      completed: "انجام شده",
      cancelled: "لغو شده",
    };

    logActivity({
      eventType: status === "cancelled" ? "booking_cancelled" : "booking_status_changed",
      entityType: "booking",
      entityId: bookingId,
      description: `وضعیت نوبت ${current[0]?.customer_name || current[0]?.customer_phone || ""} از ${statusLabels[oldStatus] || oldStatus} به ${statusLabels[status] || status} تغییر کرد`,
      metadata: { bookingId, oldStatus, newStatus: status, customer_name: current[0]?.customer_name, customer_phone: current[0]?.customer_phone },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update booking status error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
