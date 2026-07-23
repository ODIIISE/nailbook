import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    // Salon stats
    const { rows: salons } = await sql`
      SELECT id, name, slug, phone, address, is_active, created_at,
        (SELECT COUNT(*) FROM users WHERE salon_id = salons.id) as user_count,
        (SELECT COUNT(*) FROM bookings WHERE salon_id = salons.id) as booking_count
      FROM salons ORDER BY created_at DESC
    `;

    // Booking stats
    const { rows: bookingStats } = await sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'reserved') as reserved,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE paid = true) as paid,
        COUNT(*) FILTER (WHERE paid = false) as unpaid
      FROM bookings
    `;

    // Today's bookings
    const today = new Date().toISOString().split("T")[0];
    const { rows: todayStats } = await sql`
      SELECT COUNT(*) as count FROM bookings WHERE date_gregorian = ${today}::date
    `;

    // Revenue (sum of service prices for paid bookings)
    const { rows: revenueStats } = await sql`
      SELECT
        COALESCE(SUM(s.price), 0) as total_revenue,
        COALESCE(SUM(s.price) FILTER (WHERE b.paid = true), 0) as paid_revenue,
        COALESCE(SUM(s.price) FILTER (WHERE b.paid = false), 0) as unpaid_revenue
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      WHERE b.status IN ('reserved', 'confirmed', 'completed')
    `;

    // Revenue per salon
    const { rows: salonRevenue } = await sql`
      SELECT
        sal.name as salon_name,
        COALESCE(SUM(s.price), 0) as revenue,
        COUNT(b.id) as bookings,
        COUNT(b.id) FILTER (WHERE b.paid = true) as paid_bookings
      FROM salons sal
      LEFT JOIN bookings b ON b.salon_id = sal.id AND b.status IN ('reserved', 'confirmed', 'completed')
      LEFT JOIN services s ON b.service_id = s.id
      GROUP BY sal.id, sal.name
      ORDER BY revenue DESC
    `;

    // Bookings per day (last 7 days)
    const { rows: dailyBookings } = await sql`
      SELECT date_gregorian as date, COUNT(*) as count
      FROM bookings
      WHERE date_gregorian >= (CURRENT_DATE - INTERVAL '7 days')
      GROUP BY date_gregorian
      ORDER BY date_gregorian ASC
    `;

    // Total users
    const { rows: userStats } = await sql`
      SELECT COUNT(*) as total FROM users
    `;

    return NextResponse.json({
      salons,
      bookingStats: bookingStats[0] || {},
      todayBookings: todayStats[0]?.count || 0,
      revenue: revenueStats[0] || {},
      salonRevenue,
      dailyBookings,
      totalUsers: userStats[0]?.total || 0,
    });
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
