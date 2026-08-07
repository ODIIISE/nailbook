import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { resolveSalonId } from "@/lib/multi-tenant";
import { normalizeDigits } from "@/lib/digits";
import { bookingRequestSchema } from "@/lib/booking/schema";
import { createBooking } from "@/lib/booking/service";
import { BookingError, createBookingError } from "@/lib/booking/errors";

/**
 * POST /api/book
 *
 * Thin route handler:
 * 1. Verifies the customer session (if any).
 * 2. Validates and normalizes the request body.
 * 3. Delegates the actual booking logic to the service layer.
 */
export async function POST(request: NextRequest) {
  // Step 1: derive user_id ONLY from the verified session cookie.
  let verifiedUserId: string | null = null;
  try {
    const sessionCookie = request.cookies.get("session")?.value;
    if (sessionCookie) {
      verifiedUserId = await verifyCustomerSessionWithVersion(sessionCookie);
    }
  } catch {
    verifiedUserId = null;
  }

  // Step 2: parse and validate the request body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: "INVALID_JSON", error: "درخواست نامعتبر است" },
      { status: 400 }
    );
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "VALIDATION_ERROR",
        error: "اطلاعات ناقص یا نامعتبر است",
        details: parsed.error.issues.map((issue) => issue.path.join(".")),
      },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // Step 3: normalize the phone server-side and validate the format.
  const phone = normalizeDigits(String(input.phone).trim());
  if (!/^09\d{9}$/.test(phone)) {
    const err = createBookingError("INVALID_PHONE");
    return NextResponse.json(err.toJSON(), { status: err.status });
  }

  // Step 4: public bookings must come from a verified customer session.
  // Owner-created bookings use /api/owner/bookings and intentionally follow
  // the separate manual-booking rules.
  if (!verifiedUserId) {
    const err = createBookingError("UNAUTHORIZED");
    return NextResponse.json(err.toJSON(), { status: err.status });
  }

  // Bind the request phone to the verified session. This prevents a caller
  // from reusing a valid session to create a booking under another phone.
  try {
    const salonId = await resolveSalonId();
    const result = salonId
      ? await sql.query("SELECT phone FROM users WHERE id = $1 AND salon_id = $2 LIMIT 1", [verifiedUserId, salonId])
      : await sql.query("SELECT phone FROM users WHERE id = $1 LIMIT 1", [verifiedUserId]);
    const sessionPhone = normalizeDigits(String(result.rows[0]?.phone || ""));
    if (!sessionPhone || sessionPhone !== phone) {
      const err = createBookingError("UNAUTHORIZED");
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
  } catch {
    const err = createBookingError("UNAUTHORIZED");
    return NextResponse.json(err.toJSON(), { status: err.status });
  }

  // Step 5: create the booking via the service layer.
  try {
    const booking = await createBooking(input, verifiedUserId, phone);

    return NextResponse.json({
      success: true,
      booking_id: booking.id,
      start_time: booking.start_time,
      end_time: booking.end_time,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json(error.toJSON(), { status: error.status });
    }

    console.error("[BOOK] Unexpected error:", error);
    const serverError = createBookingError("SERVER_ERROR");
    return NextResponse.json(serverError.toJSON(), { status: serverError.status });
  }
}
