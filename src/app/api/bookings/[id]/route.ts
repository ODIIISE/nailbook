import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";
import { resolveSalonId } from "@/lib/multi-tenant";
import { getTehranNow } from "@/lib/time";

// Customer may only cancel these statuses — completed/in-progress/past
// appointments stay untouched so the owner's timeline and earnings hold.
const CUSTOMER_CANCELLABLE_STATUSES = new Set(["reserved", "confirmed"]);

function minutesOfDay(timeText: string): number {
  const [h, m] = timeText.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

// PATCH: Cancel a booking (owner or the booking's user)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if owner
    const owner = await verifyOwner(request);

    // Get the booking within the current salon deployment when multi-tenant mode is enabled.
    const salonId = await resolveSalonId();
    const bookingResult = salonId
      ? await sql.query("SELECT id, user_id, customer_phone, status, date_gregorian::text, start_time::text FROM bookings WHERE id = $1 AND salon_id = $2", [id, salonId])
      : await sql`SELECT id, user_id, customer_phone, status, date_gregorian::text, start_time::text FROM bookings WHERE id = ${id}`;
    const rows = bookingResult.rows;
    if (!rows[0]) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }

    const booking = rows[0];

    // If not owner, verify the customer owns this booking. The version-checked
    // verifier rejects cookies revoked via logout/session bump.
    if (!owner) {
      const customerUserId = verifyCustomerSessionWithVersion(request.cookies.get("session")?.value);
      if (!customerUserId || booking.user_id !== customerUserId) {
        return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
      }
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "نوبت قبلاً لغو شده" }, { status: 400 });
    }

    // Customers may only cancel their own future reserved/confirmed bookings.
    // Owners keep the full override the spec grants them.
    if (!owner) {
      if (!CUSTOMER_CANCELLABLE_STATUSES.has(booking.status)) {
        return NextResponse.json({ error: "امکان لغو نوبت در این وضعیت وجود ندارد" }, { status: 400 });
      }
      const now = getTehranNow();
      const dateText = String(booking.date_gregorian);
      if (
        dateText < now.dateKey
        || (dateText === now.dateKey && minutesOfDay(String(booking.start_time)) < now.minutes)
      ) {
        return NextResponse.json({ error: "نوبت‌های گذشته قابل لغو نیستند" }, { status: 400 });
      }
    }

    if (salonId) {
      await sql.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND salon_id = $2", [id, salonId]);
    } else {
      await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id}`;
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

    const salonId = await resolveSalonId();
    const bookingResult = salonId
      ? await sql.query("SELECT id, customer_phone, customer_name FROM bookings WHERE id = $1 AND salon_id = $2", [id, salonId])
      : await sql`SELECT id, customer_phone, customer_name FROM bookings WHERE id = ${id}`;
    const rows = bookingResult.rows;
    if (!rows[0]) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }

    if (salonId) {
      await sql.query("DELETE FROM bookings WHERE id = $1 AND salon_id = $2", [id, salonId]);
    } else {
      await sql`DELETE FROM bookings WHERE id = ${id}`;
    }

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
