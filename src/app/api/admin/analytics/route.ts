import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const rawSalonId = searchParams.get("salon_id") || "";
    const rawDays = parseInt(searchParams.get("days") || "30");
    const days = Number.isNaN(rawDays) || rawDays <= 0 ? 30 : rawDays;

    // Validate salon_id as a UUID or empty
    const salonId = /^[0-9a-fA-F-]{36}$/.test(rawSalonId) ? rawSalonId : "";
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    switch (type) {
      case "booking-volume": {
        const { rows } = await sql`
          SELECT date_gregorian as date, COUNT(*) as count
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.date_gregorian >= ${startDate}::date
          GROUP BY date_gregorian ORDER BY date_gregorian ASC
        `;
        return NextResponse.json(rows);
      }

      case "no-show-rate": {
        const { rows } = await sql`
          SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
            ROUND(COUNT(*) FILTER (WHERE status = 'no_show')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as rate
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.date_gregorian >= ${startDate}::date
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "cancellation-rate": {
        const { rows } = await sql`
          SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            ROUND(COUNT(*) FILTER (WHERE status = 'cancelled')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as rate
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.date_gregorian >= ${startDate}::date
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "repeat-rate": {
        const { rows } = await sql`
          WITH customer_bookings AS (
            SELECT customer_phone, COUNT(*) as booking_count
            FROM bookings b
            WHERE (${salonId} = '' OR b.salon_id = ${salonId})
            AND b.date_gregorian >= ${startDate}::date
            GROUP BY customer_phone
          )
          SELECT COUNT(*) as total_customers,
            COUNT(*) FILTER (WHERE booking_count > 1) as returning_customers,
            ROUND(COUNT(*) FILTER (WHERE booking_count > 1)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as rate
          FROM customer_bookings
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "peak-hours": {
        const { rows } = await sql`
          SELECT EXTRACT(HOUR FROM start_time::time) as hour, COUNT(*) as count
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND status != 'cancelled'
          AND b.date_gregorian >= ${startDate}::date
          GROUP BY hour ORDER BY hour
        `;
        return NextResponse.json(rows);
      }

      case "lead-time": {
        const { rows } = await sql`
          SELECT ROUND(AVG(date_gregorian::date - created_at::date)) as avg_days,
            MIN(date_gregorian::date - created_at::date) as min_days,
            MAX(date_gregorian::date - created_at::date) as max_days
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.date_gregorian >= ${startDate}::date
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "customer-split": {
        const { rows } = await sql`
          WITH customer_first_booking AS (
            SELECT customer_phone, MIN(created_at) as first_booking
            FROM bookings b
            WHERE (${salonId} = '' OR b.salon_id = ${salonId})
            GROUP BY customer_phone
          )
          SELECT
            COUNT(*) FILTER (WHERE first_booking >= (CURRENT_DATE - INTERVAL '1 day' * ${days})) as new_customers,
            COUNT(*) FILTER (WHERE first_booking < (CURRENT_DATE - INTERVAL '1 day' * ${days})) as returning_customers
          FROM customer_first_booking
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "customer-activity": {
        const phone = searchParams.get("phone") || "";
        if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
        const { rows } = await sql`
          SELECT id, customer_name, customer_phone, date_gregorian, start_time, end_time, status, paid, created_at
          FROM bookings b
          WHERE customer_phone = ${phone}
          AND (${salonId} = '' OR b.salon_id = ${salonId})
          ORDER BY created_at DESC LIMIT 50
        `;
        return NextResponse.json(rows);
      }

      case "top-customers": {
        const { rows } = await sql`
          SELECT customer_phone, customer_name, COUNT(*) as booking_count,
            MAX(date_gregorian) as last_booking
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND status != 'cancelled'
          AND b.date_gregorian >= ${startDate}::date
          GROUP BY customer_phone, customer_name
          ORDER BY booking_count DESC LIMIT 10
        `;
        return NextResponse.json(rows);
      }

      case "occupancy": {
        const { rows } = await sql`
          SELECT COUNT(*) as booked_slots,
            (SELECT COUNT(*) FROM salons) as total_salons
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND status != 'cancelled'
          AND b.date_gregorian = CURRENT_DATE
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "service-popularity": {
        const { rows } = await sql`
          SELECT s.name, COUNT(b.id) as booking_count
          FROM bookings b
          JOIN services s ON b.service_id = s.id
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.status != 'cancelled'
          AND b.date_gregorian >= ${startDate}::date
          GROUP BY s.name ORDER BY booking_count DESC LIMIT 10
        `;
        return NextResponse.json(rows);
      }

      case "avg-duration": {
        const { rows } = await sql`
          SELECT s.name, ROUND(AVG(s.duration_minutes)) as avg_minutes
          FROM bookings b
          JOIN services s ON b.service_id = s.id
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.status != 'cancelled'
          GROUP BY s.name ORDER BY avg_minutes DESC
        `;
        return NextResponse.json(rows);
      }

      case "blocked-usage": {
        const { rows } = await sql`
          SELECT COUNT(*) as total_blocks,
            SUM(EXTRACT(HOUR FROM end_time::time - start_time::time)) as total_hours_blocked
          FROM blocked_times bt
          WHERE (${salonId} = '' OR bt.salon_id = ${salonId})
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "completion-rate": {
        const { rows } = await sql`
          SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as rate
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.date_gregorian >= ${startDate}::date
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "payment-status": {
        const { rows } = await sql`
          SELECT COUNT(*) as total,
            COUNT(*) FILTER (WHERE paid = true) as paid,
            COUNT(*) FILTER (WHERE paid = false) as unpaid,
            ROUND(COUNT(*) FILTER (WHERE paid = true)::numeric / NULLIF(COUNT(*), 0) * 100, 1) as paid_rate
          FROM bookings b
          WHERE (${salonId} = '' OR b.salon_id = ${salonId})
          AND b.status IN ('reserved', 'confirmed', 'completed')
        `;
        return NextResponse.json(rows[0] || {});
      }

      case "conflicts": {
        const { rows } = await sql`
          SELECT b1.id, b1.customer_name, b1.date_gregorian, b1.start_time, b1.end_time,
                 b2.id as conflict_id, b2.customer_name as conflict_name
          FROM bookings b1
          JOIN bookings b2 ON b1.id != b2.id
            AND b1.date_gregorian = b2.date_gregorian
            AND b1.start_time < b2.end_time
            AND b1.end_time > b2.start_time
            AND b1.status != 'cancelled' AND b2.status != 'cancelled'
          WHERE (${salonId} = '' OR b1.salon_id = ${salonId})
          LIMIT 20
        `;
        return NextResponse.json(rows);
      }

      default:
        return NextResponse.json({ error: "نوع نامعتبر" }, { status: 400 });
    }
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
