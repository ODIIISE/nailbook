import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSalonId } from "@/lib/multi-tenant";

/**
 * GET /api/social-proof — Returns live booking statistics for social proof pulse.
 * Public endpoint (no auth required) — cached for 60s via ISR.
 */
export const revalidate = 60;

export async function GET() {
  try {
    const salonId = getSalonId();
    const { rows } = salonId
      ? await sql.query(
          `SELECT
             COUNT(*) FILTER (WHERE status IN ('reserved', 'confirmed', 'completed', 'in_progress')) AS total_bookings,
             COUNT(*) FILTER (WHERE status IN ('reserved', 'confirmed') AND date_gregorian >= CURRENT_DATE) AS upcoming_bookings
           FROM bookings
           WHERE salon_id = (
             SELECT id FROM salons
             WHERE id::text = $1 OR slug = $1
             LIMIT 1
           )`,
          [salonId]
        )
      : await sql`
          SELECT
            COUNT(*) FILTER (WHERE status IN ('reserved', 'confirmed', 'completed', 'in_progress')) AS total_bookings,
            COUNT(*) FILTER (WHERE status IN ('reserved', 'confirmed') AND date_gregorian >= CURRENT_DATE) AS upcoming_bookings
          FROM bookings
        `;

    return NextResponse.json({
      totalBookings: Number(rows[0].total_bookings) || 0,
      upcomingBookings: Number(rows[0].upcoming_bookings) || 0,
    });
  } catch (error) {
    console.error("Social proof fetch error:", error);
    return NextResponse.json({ totalBookings: 0, upcomingBookings: 0 });
  }
}
