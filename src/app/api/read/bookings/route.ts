import type { NextRequest } from "next/server";

/**
 * Refactored /api/read/bookings: the handler lives in
 * src/lib/db/bookings-read.ts so /api/read/bootstrap can serve the exact
 * same payload without duplicating branch logic.
 */
export async function GET(request: NextRequest) {
  const { readBookingsPayload } = await import("@/lib/db/bookings-read");
  return readBookingsPayload(request);
}

export const runtime = "nodejs";
