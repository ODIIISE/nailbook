import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";
    const salonId = searchParams.get("salon_id") || "";
    const startDate = searchParams.get("start") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = searchParams.get("end") || new Date().toISOString().split("T")[0];

    const salonClause = salonId ? `AND b.salon_id = '${salonId}'` : "";
    const query = (sqlStr: string) => sql.query(sqlStr);

    if (type === "daily") {
      const { rows } = await query(`
        SELECT COUNT(*) as total_bookings,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE paid = true) as paid,
          COUNT(*) FILTER (WHERE paid = false AND status != 'cancelled') as unpaid,
          COUNT(DISTINCT customer_phone) as unique_customers
        FROM bookings b WHERE date_gregorian = CURRENT_DATE ${salonClause}
      `);
      return NextResponse.json({ type: "daily", date: new Date().toISOString().split("T")[0], ...rows[0] });
    }

    if (type === "weekly") {
      const { rows } = await query(`
        SELECT date_gregorian as date, COUNT(*) as bookings,
          COUNT(*) FILTER (WHERE paid = true) as paid
        FROM bookings b WHERE date_gregorian >= (CURRENT_DATE - INTERVAL '7 days') ${salonClause}
        GROUP BY date_gregorian ORDER BY date_gregorian
      `);
      return NextResponse.json({ type: "weekly", data: rows });
    }

    if (type === "custom") {
      const { rows } = await query(`
        SELECT date_gregorian as date, COUNT(*) as bookings,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE paid = true) as paid
        FROM bookings b WHERE date_gregorian >= '${startDate}'::date
        AND date_gregorian <= '${endDate}'::date ${salonClause}
        GROUP BY date_gregorian ORDER BY date_gregorian
      `);
      return NextResponse.json({ type: "custom", start: startDate, end: endDate, data: rows });
    }

    return NextResponse.json({ error: "نوع نامعتبر" }, { status: 400 });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
