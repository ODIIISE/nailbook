import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { resolveSalonId } from "@/lib/multi-tenant";

export async function GET() {
  try {
    const salonId = await resolveSalonId();
    try {
      const { rows } = salonId
        ? await sql.query(
            `SELECT date_gregorian, start_time, end_time, reason
             FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`,
            [salonId]
          )
        : await sql`SELECT date_gregorian, start_time, end_time, reason FROM blocked_times ORDER BY date_gregorian`;
      return NextResponse.json({ blockedTimes: rows });
    } catch (error) {
      // Pre-027 databases have no reason column — serve the base list.
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      if (code !== "42703" && !/column .* does not exist/i.test(message)) throw error;
      const { rows } = salonId
        ? await sql.query(
            `SELECT date_gregorian, start_time, end_time
             FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`,
            [salonId]
          )
        : await sql`SELECT date_gregorian, start_time, end_time FROM blocked_times ORDER BY date_gregorian`;
      return NextResponse.json({ blockedTimes: rows });
    }
  } catch {
    // A failed read must NOT look like an empty list. The client keeps its
    // last-known blocks on non-OK responses; a 200 [] here would make the
    // next full-replace PUT wipe every saved block server-side.
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
