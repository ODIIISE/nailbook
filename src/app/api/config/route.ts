import { NextResponse } from "next/server";

/**
 * Returns app configuration.
 * Used by the frontend to determine if it's in admin mode or salon mode.
 */
export async function GET() {
  const salonId = process.env.SALON_ID;

  return NextResponse.json({
    salonId: salonId || null,
    isAdmin: !salonId || salonId.trim() === "",
    isSalon: !!salonId && salonId.trim() !== "",
  });
}
