import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { parseGregorianDateKey } from "@/lib/time";

interface BlockedTimeItem {
  date_gregorian: string;
  start_time: string;
  end_time: string;
}

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

    const { blockedTimes }: { blockedTimes: BlockedTimeItem[] } = await request.json();
    if (!Array.isArray(blockedTimes)) {
      return NextResponse.json({ error: "داده نامعتبر است" }, { status: 400 });
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
    for (const block of blockedTimes) {
      const parsedDate = parseGregorianDateKey(block.date_gregorian);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(block.date_gregorian) ||
        !Number.isFinite(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== block.date_gregorian ||
        !timePattern.test(block.start_time) ||
        !timePattern.test(block.end_time) ||
        block.end_time.slice(0, 5) <= block.start_time.slice(0, 5)
      ) {
        return NextResponse.json({ error: "تاریخ یا ساعت مسدودی نامعتبر است" }, { status: 400 });
      }
    }

    // Validate no overlapping blocks within the same day
    if (blockedTimes && blockedTimes.length > 1) {
      const sorted = [...blockedTimes].sort((a, b) => {
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

    // Serialize block changes with booking creation/status changes and reject
    // a block that would hide an already active appointment. Lock dates that
    // are being removed too; otherwise a booking could race a snapshot update
    // for a date omitted from the incoming list.
    const { rows: existingDates } = await client.query(
      `SELECT DISTINCT date_gregorian::text AS date_gregorian FROM blocked_times`
    );
    const dates = new Set([
      ...existingDates.map((row: { date_gregorian: string }) => row.date_gregorian),
      ...blockedTimes.map((block) => block.date_gregorian),
    ]);
    for (const date of dates) {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [date]);
    }
    for (const block of blockedTimes) {
      const { rows: conflicts } = await client.query(
        `SELECT id FROM bookings
         WHERE date_gregorian = $1::date
         AND status IN ('reserved', 'confirmed', 'in_progress')
         AND start_time < ($2 || ':00')::time
         AND end_time > ($3 || ':00')::time
         LIMIT 1`,
        [block.date_gregorian, block.end_time.slice(0, 5), block.start_time.slice(0, 5)]
      );
      if (conflicts.length > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "این زمان با یک نوبت فعال تداخل دارد" }, { status: 409 });
      }
    }

    await client.query("DELETE FROM blocked_times");

    if (blockedTimes.length > 0) {
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
  } catch {
    if (client) {
      try { await client.query("ROLLBACK"); } catch (rbError) { console.error("ROLLBACK failed:", rbError); }
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
