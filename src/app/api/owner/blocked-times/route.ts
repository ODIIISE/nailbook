import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

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

    // Validate no overlapping blocks within the same day
    if (blockedTimes && blockedTimes.length > 1) {
      const sorted = [...blockedTimes].sort((a: any, b: any) => {
        if (a.date_gregorian !== b.date_gregorian) return a.date_gregorian.localeCompare(b.date_gregorian);
        return a.start_time.localeCompare(b.start_time);
      });
      for (let i = 0; i < sorted.length - 1; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        if (curr.date_gregorian === next.date_gregorian && curr.end_time > next.start_time) {
          return NextResponse.json({
            error: `زمان‌های مسدود شده در ${curr.date_gregorian} همپوشانی دارند`,
          }, { status: 400 });
        }
      }
    }

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
      try { await client.query("ROLLBACK"); } catch (rbError) { console.error("ROLLBACK failed:", rbError); }
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
