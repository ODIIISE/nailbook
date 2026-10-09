import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { resolveSalonId } from "@/lib/multi-tenant";

export async function GET() {
  try {
    const salonId = await resolveSalonId();
    let extraSelect = "";
    try {
      const { rows: colRows } = await sql.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'blocked_times'
         AND column_name IN ('reason', 'artist_id')`
      );
      extraSelect = colRows.map((r) => `, ${String(r.column_name)}`).join("");
    } catch {
      /* catalog unreadable — serve the base list */
    }
    const { rows } = salonId
      ? await sql.query(
          `SELECT date_gregorian, start_time, end_time${extraSelect}
           FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`,
          [salonId]
        )
      : await sql.query(
          `SELECT date_gregorian, start_time, end_time${extraSelect}
           FROM blocked_times ORDER BY date_gregorian`
        );
    return NextResponse.json({ blockedTimes: rows });
  } catch {
    // A failed read must NOT look like an empty list. The client keeps its
    // last-known blocks on non-OK responses; a 200 [] here would make the
    // next full-replace PUT wipe every saved block server-side.
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
