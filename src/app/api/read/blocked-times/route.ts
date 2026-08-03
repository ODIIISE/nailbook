import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSalonId } from "@/lib/multi-tenant";

export async function GET() {
  try {
    const salonId = getSalonId();
    const { rows } = salonId
      ? await sql.query(
          `SELECT date_gregorian, start_time, end_time
           FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`,
          [salonId]
        )
      : await sql`SELECT date_gregorian, start_time, end_time FROM blocked_times ORDER BY date_gregorian`;
    return NextResponse.json({ blockedTimes: rows });
  } catch {
    return NextResponse.json({ blockedTimes: [] });
  }
}
