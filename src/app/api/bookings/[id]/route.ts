import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { verifyCustomerSession } from "@/lib/customer-auth";

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
      const customerUserId = verifyCustomerSession(request.cookies.get("session")?.value);
      if (!customerUserId || booking.user_id !== customerUserId) {
        return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
      }
    }

    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "نوبت قبلاً لغو شده" }, { status: 400 });
    }

    await sql`UPDATE bookings SET status = 'cancelled' WHERE id = ${id}`;

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

    const { rows } = await sql`SELECT id FROM bookings WHERE id = ${id}`;
    if (!rows[0]) {
      return NextResponse.json({ error: "نوبت یافت نشد" }, { status: 404 });
    }

    await sql`DELETE FROM bookings WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete booking error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
