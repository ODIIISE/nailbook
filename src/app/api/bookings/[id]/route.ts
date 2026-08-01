import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";

// PATCH: Cancel a booking (owner or the booking's user)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if owner
    const owner = await verifyOwner(request);

    // Get the booking
    const { rows } = await sql`SELECT id, user_id, customer_phone, status FROM bookings WHERE id = ${id}`;
    if (!rows[0]) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }

    const booking = rows[0];

    // If not owner, verify the customer owns this booking
    if (!owner) {
      const customerUserId = await verifyCustomerSessionWithVersion(request.cookies.get("session")?.value);
      if (!customerUserId || booking.user_id !== customerUserId) {
        return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
      }
    }

    // Customers may only cancel an upcoming booking. Owners can still
    // cancel from the dashboard, including historical records.
    const customerCanCancel = ["pending", "reserved", "confirmed"].includes(booking.status);
    if (!owner && !customerCanCancel) {
      return NextResponse.json({ error: "این نوبت دیگر قابل لغو نیست" }, { status: 400 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "نوبت قبلاً لغو شده" }, { status: 400 });
    }

    // Keep the status guard in the write as well as the read above. This
    // prevents two near-simultaneous customer cancellation requests from
    // racing a status transition and makes the operation idempotent.
    const update = owner
      ? await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id} AND status <> 'cancelled' RETURNING id`
      : await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id} AND status IN ('pending', 'reserved', 'confirmed') RETURNING id`;
    if (update.rows.length === 0) {
      return NextResponse.json({ error: "این نوبت دیگر قابل لغو نیست" }, { status: 409 });
    }

    // Log the cancellation
    logActivity({
      eventType: "booking_cancelled",
      entityType: "booking",
      entityId: id,
      description: `نوبت ${booking.customer_phone} لغو شد`,
      metadata: { booking_id: id, customer_phone: booking.customer_phone },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// DELETE: Delete a booking (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { id } = await params;

    const { rows } = await sql`SELECT id, customer_phone, customer_name FROM bookings WHERE id = ${id}`;
    if (!rows[0]) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }

    await sql`DELETE FROM bookings WHERE id = ${id}`;

    logActivity({
      eventType: "booking_deleted",
      entityType: "booking",
      entityId: id,
      description: `نوبت ${rows[0].customer_name || rows[0].customer_phone} حذف شد`,
      metadata: { booking_id: id, customer_phone: rows[0].customer_phone },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete booking error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
