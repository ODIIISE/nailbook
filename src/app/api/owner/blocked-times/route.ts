import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function GET() {
  try {
    const { rows } = await sql`SELECT date_gregorian, start_time, end_time FROM blocked_times ORDER BY date_gregorian`;
    return NextResponse.json({ blockedTimes: rows });
  } catch {
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let client;
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { blockedTimes } = await request.json();

    client = await sql.connect();
    await client.query("BEGIN");
    await client.query("DELETE FROM blocked_times");

    if (blockedTimes && blockedTimes.length > 0) {
      for (const b of blockedTimes) {
        await client.query(
          "INSERT INTO blocked_times (date_gregorian, start_time, end_time) VALUES ($1, $2, $3)",
          [b.date_gregorian, b.start_time, b.end_time]
        );
      }
    }

    await client.query("COMMIT");

    logActivity({
      eventType: "time_blocked",
      entityType: "blocked_time",
      description: `${blockedTimes?.length || 0} زمان مسدود شد`,
      metadata: { count: blockedTimes?.length || 0 },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
