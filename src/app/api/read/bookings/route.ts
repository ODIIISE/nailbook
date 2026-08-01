import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";

type BookingRow = Record<string, unknown>;

/**
 * GET /api/read/bookings
 *
 * - ?scope=owner: full salon timeline, owner session required.
 * - no scope: privacy-safe shared payload. Guests receive only active time
 *   blocks; signed-in customers receive their own full bookings plus minimal
 *   active blocks for everyone else. This keeps the public booking calendar
 *   correct without exposing names, phone numbers, or booking IDs.
 */
export async function GET(request: NextRequest) {
  try {
    const scope = new URL(request.url).searchParams.get("scope");
    const sessionCookie = request.cookies.get("session")?.value;

    if (scope === "owner") {
      const owner = await verifyOwner(request);
      if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

      const { rows } = await sql`
        SELECT id, user_id, service_id, selected_addons, customer_name, customer_phone,
               date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
               phone_verified, created_at
        FROM bookings
        WHERE date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
        ORDER BY created_at DESC
        LIMIT 200
      `;
      return NextResponse.json(normalizePrivateRows(rows));
    }

    // A default read powers both the public calendar and customer history.
    // Never return private fields for another customer.
    const customerUserId = sessionCookie
      ? await verifyCustomerSessionWithVersion(sessionCookie)
      : null;

    let customerPhone: string | null = null;
    if (customerUserId) {
      const { rows: users } = await sql`
        SELECT phone FROM users WHERE id = ${customerUserId} LIMIT 1
      `;
      customerPhone = typeof users[0]?.phone === "string" ? users[0].phone : null;
    }

    // Availability is deliberately non-PII. It is also available to guests so
    // the booking calendar can always prevent a slot conflict before login.
    // Do not expose id/user_id/service_id: a booking id is also a public
    // receipt route and would make an otherwise anonymous row enumerable.
    const { rows: availabilityRows } = await sql`
      SELECT date_gregorian::text as date_gregorian,
             start_time, end_time, status
      FROM bookings
      WHERE date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
        AND status IN ('reserved', 'confirmed', 'in_progress')
      ORDER BY date_gregorian, start_time
      LIMIT 500
    `;

    if (!customerUserId || !customerPhone) {
      return NextResponse.json(normalizeAvailabilityRows(availabilityRows));
    }

    const { rows: ownRows } = await sql`
      SELECT id, user_id, service_id, selected_addons, customer_name, customer_phone,
             date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
             phone_verified, created_at
      FROM bookings
      WHERE (user_id = ${customerUserId} OR customer_phone = ${customerPhone})
        AND date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
      ORDER BY created_at DESC
      LIMIT 200
    `;

    // Avoid duplicating an owned booking in the merged availability payload
    // without relying on a publicly exposed booking identifier.
    // Only active owned rows should suppress the matching anonymous block.
    // A cancelled/pending own booking must not hide another customer's active
    // reservation at the same time from the calendar.
    const ownSlots = new Set(
      ownRows
        .filter((row) => ["reserved", "confirmed", "in_progress"].includes(String(row.status)))
        .map((row) => slotKey(row))
    );
    return NextResponse.json([
      ...normalizePrivateRows(ownRows),
      ...normalizeAvailabilityRows(availabilityRows.filter((row) => !ownSlots.has(slotKey(row)))),
    ]);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

function slotKey(row: BookingRow): string {
  return [row.date_gregorian, row.start_time, row.end_time].map((value) => String(value ?? "")).join("|");
}

function normalizePrivateRows(rows: BookingRow[]) {
  return rows.map((row) => ({
    ...normalizeCommonRow(row),
    id: row.id,
    user_id: row.user_id,
    service_id: row.service_id,
    selected_addons: Array.isArray(row.selected_addons) ? row.selected_addons : [],
    customer_name: typeof row.customer_name === "string" ? row.customer_name : "",
    customer_phone: typeof row.customer_phone === "string" ? row.customer_phone : "",
    date: typeof row.date === "string" ? row.date : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
  }));
}

function normalizeAvailabilityRows(rows: BookingRow[]) {
  return rows.map((row) => normalizeCommonRow(row));
}

function normalizeCommonRow(row: BookingRow) {
  return {
    ...row,
    date_gregorian: row.date_gregorian ? String(row.date_gregorian).split("T")[0] : row.date_gregorian,
    start_time: typeof row.start_time === "string" ? row.start_time : "00:00",
    end_time: typeof row.end_time === "string" ? row.end_time : "00:00",
    status: typeof row.status === "string" ? row.status : "reserved",
    phone_verified: normalizeBoolean(row.phone_verified),
    paid: normalizeBoolean(row.paid),
  };
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value.toLowerCase() === "true" || value === "1";
  return false;
}
