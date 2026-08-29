import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { resolveSalonId } from "@/lib/multi-tenant";

const ACTIVE_STATUSES = ["reserved", "confirmed", "in_progress"];

function splitDateKeys<T extends { date_gregorian: string | null }>(rows: T[]): T[] {
  return rows.map((r) => ({
    ...r,
    date_gregorian: r.date_gregorian ? r.date_gregorian.split("T")[0] : r.date_gregorian,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    const salonId = await resolveSalonId();
    if (!owner && !salonId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    // Cursor pagination: `before` is a created_at ISO timestamp; responses
    // return rows older than it so the owner UI can page past the ceiling.
    const url = new URL(request.url);
    const beforeParam = url.searchParams.get("before");
    const limitParam = Number(url.searchParams.get("limit"));
    const limit = owner
      ? Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 1000) : 200
      : 1000;

    if (owner) {
      const params: unknown[] = salonId ? [salonId] : [];
      let beforeClause = "";
      if (beforeParam && !Number.isNaN(Date.parse(beforeParam))) {
        params.push(beforeParam);
        beforeClause = ` AND created_at < $${params.length}`;
      }
      const result = await sql.query(
        `SELECT id, service_id, selected_addons, customer_name, customer_phone,
                date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
                phone_verified, created_at, service_name, price_total
         FROM bookings
         WHERE ${salonId ? "salon_id = $1 AND " : ""}date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')${beforeClause}
         ORDER BY created_at DESC
         LIMIT ${limit}`,
        params
      );
      return NextResponse.json(splitDateKeys(result.rows));
    }

    // Non-owner reads power two consumers: the public availability calendar
    // (guests, deliberately PII-free) and a signed-in customer's own history.
    // Restore note: the customer branch was accidentally dropped during the
    // pagination rewrite — without it, "نوبت‌های من" could never list anything.
    const sessionCookie = request.cookies.get("session")?.value;
    const customerUserId = sessionCookie
      ? await verifyCustomerSessionWithVersion(sessionCookie)
      : null;

    let customerPhone: string | null = null;
    if (customerUserId && salonId) {
      const { rows: users } = await sql.query(
        "SELECT phone FROM users WHERE id = $1 AND salon_id = $2 LIMIT 1",
        [customerUserId, salonId]
      );
      customerPhone = typeof users[0]?.phone === "string" ? users[0].phone : null;
    }

    const availabilityParams: unknown[] = [];
    let availabilityWhere = `date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
        AND status IN ('reserved', 'confirmed', 'in_progress')`;
    if (salonId) {
      availabilityParams.push(salonId);
      availabilityWhere = `salon_id = $1 AND ${availabilityWhere}`;
    }
    const { rows: availabilityRows } = await sql.query(
      `SELECT date_gregorian::text as date_gregorian, start_time, end_time, status
       FROM bookings
       WHERE ${availabilityWhere}
       ORDER BY date_gregorian, start_time
       LIMIT ${limit}`,
      availabilityParams
    );

    if (!customerUserId || !customerPhone) {
      return NextResponse.json(splitDateKeys(availabilityRows));
    }

    // Signed-in customer: their own full rows (incl. owner-created bookings
    // under the same phone) merged with everyone's availability blocks.
    const ownParams: unknown[] = [customerUserId, customerPhone];
    let ownSalonClause = "";
    if (salonId) {
      ownParams.push(salonId);
      ownSalonClause = ` AND salon_id = $${ownParams.length}`;
    }
    const { rows: ownRows } = await sql.query(
      `SELECT id, user_id, service_id, selected_addons, customer_name, customer_phone,
              date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
              phone_verified, created_at, service_name, price_total
       FROM bookings
       WHERE (user_id = $1 OR customer_phone = $2)${ownSalonClause}
         AND date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
       ORDER BY created_at DESC
       LIMIT 200`,
      ownParams
    );

    // Suppress an owned booking's anonymous availability twin so the same slot
    // does not render twice. Only ACTIVE owned rows suppress — a cancelled or
    // pending own booking must not hide another customer's real reservation.
    const ownActiveSlots = new Set(
      ownRows
        .filter((row) => ACTIVE_STATUSES.includes(String(row.status)))
        .map((row) => `${row.date_gregorian}|${row.start_time}|${row.end_time}`)
    );
    const mergedAvailability = availabilityRows.filter(
      (row) => !ownActiveSlots.has(`${row.date_gregorian}|${row.start_time}|${row.end_time}`)
    );

    return NextResponse.json(splitDateKeys([...ownRows, ...mergedAvailability]));
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
