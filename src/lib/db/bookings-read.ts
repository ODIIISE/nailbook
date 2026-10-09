import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyStaff, can } from "@/lib/owner-auth";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { resolveSalonId } from "@/lib/multi-tenant";

/**
 * The full bookings read payload (owner rows / customer own-history +
 * availability merge / public availability), extracted verbatim from
 * /api/read/bookings so the consolidated /api/read/bootstrap endpoint can
 * serve the identical payload without duplicating the branch logic.
 */
const ACTIVE_STATUSES = ["reserved", "confirmed", "in_progress"];

/** artist_id / note (migrations 025/026) are absent until the runner applies
 *  them. Reads try the full column list first and retry without the extras
 *  on 42703 so pre-migration deployments keep serving instead of 500ing. */
function isMissingColumn(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = String((error as { message?: string })?.message || "");
  return code === "42703" || /column .* does not exist/i.test(message);
}

async function queryBookings(
  withExtras: string,
  withoutExtras: string,
  params: unknown[]
): Promise<{ rows: { date_gregorian: string | null; [key: string]: unknown }[] }> {
  try {
    return await sql.query(withExtras, params);
  } catch (error) {
    if (!isMissingColumn(error)) throw error;
    return await sql.query(withoutExtras, params);
  }
}

function splitDateKeys<T extends { date_gregorian: string | null }>(rows: T[]): T[] {
  return rows.map((r) => ({
    ...r,
    date_gregorian: r.date_gregorian ? r.date_gregorian.split("T")[0] : r.date_gregorian,
  }));
}

export async function readBookingsPayload(request: NextRequest): Promise<NextResponse> {
  try {
    const staff = await verifyStaff(request);
    const salonId = await resolveSalonId();
    if (!staff && !salonId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    // Owner + manager see the full timeline; artists see only their assigned
    // bookings (artist_id match) below. Plain customers fall through to the
    // availability + own-history merge.
    const canSeeTimeline = staff !== null && can(staff.roles, "timeline.all");

    // Cursor pagination: `before` is a created_at ISO timestamp; responses
    // return rows older than it so the owner UI can page past the ceiling.
    const url = new URL(request.url);
    const beforeParam = url.searchParams.get("before");
    const limitParam = Number(url.searchParams.get("limit"));
    const limit = canSeeTimeline
      ? Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 1000) : 200
      : 1000;

    if (canSeeTimeline) {
      const params: unknown[] = salonId ? [salonId] : [];
      let beforeClause = "";
      if (beforeParam && !Number.isNaN(Date.parse(beforeParam))) {
        params.push(beforeParam);
        beforeClause = ` AND created_at < $${params.length}`;
      }
      const columns = `id, user_id, service_id, selected_addons, customer_name, customer_phone,
                date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
                phone_verified, created_at, service_name, price_total`;
      const result = await queryBookings(
        `SELECT ${columns}, artist_id, note, artist_user.name AS artist_name
         FROM bookings
         LEFT JOIN users AS artist_user ON artist_user.id = bookings.artist_id
         WHERE ${salonId ? "salon_id = $1 AND " : ""}date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')${beforeClause}
         ORDER BY created_at DESC
         LIMIT ${limit}`,
        `SELECT ${columns}
         FROM bookings
         WHERE ${salonId ? "salon_id = $1 AND " : ""}date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')${beforeClause}
         ORDER BY created_at DESC
         LIMIT ${limit}`,
        params
      );
      return NextResponse.json(splitDateKeys(result.rows));
    }

    if (staff) {
      // Artist scope: assigned bookings only. No availability merge — the
      // client already holds the public calendar from the bootstrap payload.
      const params: unknown[] = salonId ? [salonId, staff.id] : [staff.id];
      const idParam = salonId ? "$2" : "$1";
      const columns = `id, user_id, service_id, selected_addons, customer_name, customer_phone,
              date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
              phone_verified, created_at, service_name, price_total`;
      const result = await queryBookings(
        `SELECT ${columns}, artist_id, note, artist_user.name AS artist_name
         FROM bookings
         LEFT JOIN users AS artist_user ON artist_user.id = bookings.artist_id
         WHERE ${salonId ? "salon_id = $1 AND " : ""}artist_id = ${idParam}
           AND date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
         ORDER BY date_gregorian, start_time
         LIMIT 200`,
        `SELECT ${columns}
         FROM bookings
         WHERE ${salonId ? "salon_id = $1 AND " : ""}artist_id = ${idParam}
           AND date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
         ORDER BY date_gregorian, start_time
         LIMIT 200`,
        params
      ).catch((error) => {
        // Pre-025 databases have no artist_id column at all — an artist login
        // there has no assigned rows to show, which is an empty list, not a 500.
        if (!isMissingColumn(error)) throw error;
        return { rows: [] as { date_gregorian: string | null; [key: string]: unknown }[] };
      });
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
    const { rows: ownRows } = await queryBookings(
      `SELECT id, user_id, service_id, selected_addons, customer_name, customer_phone,
              date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
              phone_verified, created_at, service_name, price_total, artist_id, note,
              artist_user.name AS artist_name
       FROM bookings
       LEFT JOIN users AS artist_user ON artist_user.id = bookings.artist_id
       WHERE (user_id = $1 OR customer_phone = $2)${ownSalonClause}
         AND date_gregorian >= (CURRENT_DATE - INTERVAL '30 days')
       ORDER BY created_at DESC
       LIMIT 200`,
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
