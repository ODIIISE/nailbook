import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { resolveSalonId } from "@/lib/multi-tenant";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    const salonId = await resolveSalonId();
    if (!owner && !salonId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    // Customers only need occupied intervals to render availability; never
    // expose names, phone numbers, prices, or booking ownership publicly.
    // Cursor pagination: `before` is a created_at ISO timestamp; responses
    // return rows older than it so the owner UI can page past the ceiling.
    const url = new URL(request.url);
    const beforeParam = url.searchParams.get("before");
    const limitParam = Number(url.searchParams.get("limit"));
    const limit = owner
      ? Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 1000) : 200
      : 1000;
    const params: unknown[] = salonId ? [salonId] : [];
    let beforeClause = "";
    if (owner && beforeParam && !Number.isNaN(Date.parse(beforeParam))) {
      params.push(beforeParam);
      beforeClause = ` AND created_at < $${params.length}`;
    }
    const selectSql = owner
      ? `SELECT id, service_id, selected_addons, customer_name, customer_phone,
                date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
                phone_verified, created_at, service_name, price_total
         FROM bookings
         WHERE ${salonId ? "salon_id = $1 AND " : ""}date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')${beforeClause}
         ORDER BY created_at DESC
         LIMIT ${limit}`
      : `SELECT date_gregorian::text as date_gregorian, start_time, end_time
         FROM bookings
         WHERE salon_id = $1
           AND date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
           AND status IN ('reserved', 'confirmed', 'in_progress')
         ORDER BY date_gregorian, start_time
         LIMIT ${limit}`;
    const result = await sql.query(selectSql, params);
    const rows = result.rows;
    const normalized = rows.map((r) => ({
      ...r,
      date_gregorian: r.date_gregorian ? r.date_gregorian.split("T")[0] : r.date_gregorian,
    }));
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
