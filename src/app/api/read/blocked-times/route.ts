import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { resolveSalonId } from "@/lib/multi-tenant";

export async function GET() {
  try {
    const salonId = await resolveSalonId();
    const { rows } = salonId
      ? await sql.query(
          `SELECT date_gregorian, start_time, end_time
           FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`,
          [salonId]
        )
      : await sql`SELECT date_gregorian, start_time, end_time FROM blocked_times ORDER BY date_gregorian`;
    return NextResponse.json({ blockedTimes: rows });
  } catch {
    // A failed read must NOT look like an empty list. The client keeps its
    // last-known blocks on non-OK responses; a 200 [] here would make the
    // next full-replace PUT wipe every saved block server-side.
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
