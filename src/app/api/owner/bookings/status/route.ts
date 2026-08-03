import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";

// Valid state transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["reserved", "confirmed", "cancelled"],
  reserved: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: ["reserved", "confirmed"],
};

export async function POST(request: NextRequest) {
  let client;
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

    client = await sql.connect();
    await client.query("BEGIN");

    // Get current booking status
    const salonId = getSalonId();
    const currentResult = await client.query(
      salonId
        ? `SELECT status, customer_name, customer_phone, date_gregorian, start_time, end_time FROM bookings WHERE id = $1 AND salon_id = $2 FOR UPDATE`
        : `SELECT status, customer_name, customer_phone, date_gregorian, start_time, end_time FROM bookings WHERE id = $1 FOR UPDATE`,
      salonId ? [bookingId, salonId] : [bookingId]
    );
    const current = currentResult.rows;
    if (!current[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }
    const oldStatus = current[0].status;

    // Validate state transition
    const allowed = VALID_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(status)) {
      await client.query("ROLLBACK");
      return NextResponse.json({
        error: `تغییر وضعیت از ${oldStatus} به ${status} مجاز نیست`,
      }, { status: 400 });
    }    // When reopening a cancelled booking, check for conflicts
      if (oldStatus === "cancelled" && (status === "reserved" || status === "confirmed")) {
      const booking = current[0];
      const { rows: conflicts } = await client.query(
        salonId
          ? `SELECT id FROM bookings
             WHERE salon_id = $1 AND date_gregorian = $2::date
             AND status IN ('reserved', 'confirmed', 'in_progress')
             AND id != $3
             AND start_time < ($4 || ':00')::time
             AND end_time > ($5 || ':00')::time`
          : `SELECT id FROM bookings
             WHERE date_gregorian = $1::date
             AND status IN ('reserved', 'confirmed', 'in_progress')
             AND id != $2
             AND start_time < ($3 || ':00')::time
             AND end_time > ($4 || ':00')::time`,
        salonId
          ? [salonId, booking.date_gregorian, bookingId, booking.end_time, booking.start_time]
          : [booking.date_gregorian, bookingId, booking.end_time, booking.start_time]
      );

      if (conflicts.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "این زمان قبلاً رزرو شده است" }, { status: 409 });
      }
    }

    await client.query(
      salonId
        ? `UPDATE bookings SET status = $1 WHERE id = $2 AND salon_id = $3`
        : `UPDATE bookings SET status = $1 WHERE id = $2`,
      salonId ? [status, bookingId, salonId] : [status, bookingId]
    );

    await client.query("COMMIT");

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
    if (client) {
      try { await client.query("ROLLBACK"); } catch (rbError) { console.error("ROLLBACK failed:", rbError); }
    }
    console.error("Update booking status error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
