import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const alerts: any[] = [];

    // S: No-Show Alert — bookings cancelled on the same day
    const { rows: noShows } = await sql`
      SELECT b.id, b.customer_name, b.customer_phone, b.date_gregorian, sal.name as salon_name
      FROM bookings b
      JOIN salons sal ON b.salon_id = sal.id
      WHERE b.status = 'cancelled'
      AND b.date_gregorian = CURRENT_DATE
      ORDER BY b.created_at DESC LIMIT 10
    `;
    if (noShows.length > 0) {
      alerts.push({
        type: "no-show",
        title: "لغو امروز",
        message: `${noShows.length} رزرو امروز لغو شد`,
        count: noShows.length,
        items: noShows,
        severity: "warning",
      });
    }

    // T: Cancellation Alert — recent cancellations
    const { rows: cancellations } = await sql`
      SELECT b.id, b.customer_name, b.date_gregorian, b.start_time, sal.name as salon_name
      FROM bookings b
      JOIN salons sal ON b.salon_id = sal.id
      WHERE b.status = 'cancelled'
      AND b.created_at >= (NOW() - INTERVAL '24 hours')
      ORDER BY b.created_at DESC LIMIT 10
    `;
    if (cancellations.length > 3) {
      alerts.push({
        type: "cancellation",
        title: "لغوهای اخیر",
        message: `${cancellations.length} لغو در ۲۴ ساعت اخیر`,
        count: cancellations.length,
        items: cancellations,
        severity: "warning",
      });
    }

    // U: Low Activity Alert — salons with no bookings for 7 days
    const { rows: lowActivity } = await sql`
      SELECT sal.id, sal.name,
        (SELECT COUNT(*) FROM bookings b WHERE b.salon_id = sal.id AND b.created_at >= (NOW() - INTERVAL '7 days')) as recent_bookings
      FROM salons sal
      WHERE sal.is_active = true
    `;
    const inactiveSalons = lowActivity.filter((s: any) => parseInt(s.recent_bookings) === 0);
    if (inactiveSalons.length > 0) {
      alerts.push({
        type: "low-activity",
        title: "فعالیت کم",
        message: `${inactiveSalons.length} سالن در ۷ روز اخیر رزرو نداشته`,
        count: inactiveSalons.length,
        items: inactiveSalons,
        severity: "info",
      });
    }

    // V: Payment Overdue Alert — unpaid bookings older than 3 days
    const { rows: overdue } = await sql`
      SELECT b.id, b.customer_name, b.customer_phone, b.date_gregorian, sal.name as salon_name
      FROM bookings b
      JOIN salons sal ON b.salon_id = sal.id
      WHERE b.paid = false
      AND b.status IN ('reserved', 'confirmed', 'completed')
      AND b.date_gregorian < (CURRENT_DATE - INTERVAL '3 days')
      ORDER BY b.date_gregorian ASC LIMIT 10
    `;
    if (overdue.length > 0) {
      alerts.push({
        type: "payment-overdue",
        title: "پرداخت معوق",
        message: `${overdue.length} رزرو پرداخت نشده قدیمی‌تر از ۳ روز`,
        count: overdue.length,
        items: overdue,
        severity: "error",
      });
    }

    return NextResponse.json({ alerts, count: alerts.length });
  } catch (error) {
    console.error("Alerts error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
