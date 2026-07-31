import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "daily";
    const rawSalonId = searchParams.get("salon_id") || "";
    const salonId = rawSalonId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(rawSalonId)
      ? rawSalonId
      : "";
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const startDate = searchParams.get("start") || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = searchParams.get("end") || new Date().toISOString().split("T")[0];

    const isCalendarDate = (value: string) => {
      if (!datePattern.test(value)) return false;
      const [year, month, day] = value.split("-").map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
    };

    if (
      (searchParams.has("salon_id") && !salonId) ||
      !isCalendarDate(startDate) ||
      !isCalendarDate(endDate) ||
      startDate > endDate
    ) {
      return NextResponse.json({ error: "پارامتر گزارش نامعتبر است" }, { status: 400 });
    }

    // Keep user-controlled values out of SQL text. Reports previously built
    // salon/date clauses with string interpolation, allowing SQL injection.
    const query = (sqlText: string, params: unknown[] = []) => sql.query(sqlText, params);
    const params: unknown[] = [];
    const parameter = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const salonClause = salonId ? `AND b.salon_id = ${parameter(salonId)}` : "";

    if (type === "daily") {
      const { rows } = await query(`
        SELECT COUNT(*) as total_bookings,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE paid = true) as paid,
          COUNT(*) FILTER (WHERE paid = false AND status != 'cancelled') as unpaid,
          COUNT(DISTINCT customer_phone) as unique_customers
        FROM bookings b WHERE date_gregorian = CURRENT_DATE ${salonClause}
      `, params);
      return NextResponse.json({ type: "daily", date: new Date().toISOString().split("T")[0], ...rows[0] });
    }

    if (type === "weekly") {
      const { rows } = await query(`
        SELECT date_gregorian as date, COUNT(*) as bookings,
          COUNT(*) FILTER (WHERE paid = true) as paid
        FROM bookings b WHERE date_gregorian >= (CURRENT_DATE - INTERVAL '7 days') ${salonClause}
        GROUP BY date_gregorian ORDER BY date_gregorian
      `, params);
      return NextResponse.json({ type: "weekly", data: rows });
    }

    if (type === "custom") {
      const { rows } = await query(`
        SELECT date_gregorian as date, COUNT(*) as bookings,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE paid = true) as paid
        FROM bookings b WHERE date_gregorian >= ${parameter(startDate)}::date
        AND date_gregorian <= ${parameter(endDate)}::date ${salonClause}
        GROUP BY date_gregorian ORDER BY date_gregorian
      `, params);
      return NextResponse.json({ type: "custom", start: startDate, end: endDate, data: rows });
    }

    return NextResponse.json({ error: "نوع نامعتبر" }, { status: 400 });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
