import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyStaff } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { resolveSalonId } from "@/lib/multi-tenant";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isMissingColumn(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  const message = String((error as { message?: string })?.message || "");
  return code === "42703" || /column .* does not exist/i.test(message);
}

function isValidBlockedTime(b: unknown): b is BlockedTimeItem {
  const item = b as BlockedTimeItem;
  return !!item
    && typeof item.date_gregorian === "string" && ISO_DATE.test(item.date_gregorian)
    && typeof item.start_time === "string" && HH_MM.test(item.start_time)
    && typeof item.end_time === "string" && HH_MM.test(item.end_time)
    && item.end_time > item.start_time
    && (item.reason === undefined || typeof item.reason === "string");
}

interface BlockedTimeItem {
  date_gregorian: string;
  start_time: string;
  end_time: string;
  /** Free-text reason (migration 027). Optional; capped at 100 chars on write. */
  reason?: string;
}

export async function GET(request: NextRequest) {
  try {
    const staff = await verifyStaff(request, "schedule.edit");
    if (!staff) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const salonId = await resolveSalonId();
    const columns = "date_gregorian, start_time, end_time";
    try {
      const result = salonId
        ? await sql.query(`SELECT ${columns}, reason FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`, [salonId])
        : await sql`SELECT date_gregorian, start_time, end_time, reason FROM blocked_times ORDER BY date_gregorian`;
      return NextResponse.json({ blockedTimes: result.rows });
    } catch (error) {
      // Pre-027 databases have no reason column — serve the base list.
      if (!isMissingColumn(error)) throw error;
      const result = salonId
        ? await sql.query(`SELECT ${columns} FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`, [salonId])
        : await sql`SELECT date_gregorian, start_time, end_time FROM blocked_times ORDER BY date_gregorian`;
      return NextResponse.json({ blockedTimes: result.rows });
    }
  } catch {
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let client;
  try {
    const staff = await verifyStaff(request, "schedule.edit");
    if (!staff) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { blockedTimes }: { blockedTimes?: BlockedTimeItem[] } = await request.json();
    if (!Array.isArray(blockedTimes)) {
      return NextResponse.json({ error: "داده ناقص است" }, { status: 400 });
    }
    // Validate before anything reaches Postgres casts — garbage previously
    // surfaced as an unhandled 500 and rolled back the whole list.
    for (const b of blockedTimes) {
      if (!isValidBlockedTime(b)) {
        return NextResponse.json({ error: "یکی از زمان‌های ارسالی نامعتبر است" }, { status: 400 });
      }
    }

    // Validate no overlapping blocks within the same day
    if (blockedTimes.length > 1) {
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

    const salonId = await resolveSalonId();
    client = await sql.connect();
    await client.query("BEGIN");

    // Serialize against the booking paths: they lock per tenant/day before
    // checking overlaps, so a concurrent customer booking and this PUT could
    // otherwise interleave (booking lands inside a just-saved block).
    const touchedDays = [...new Set(blockedTimes.map((b) => b.date_gregorian))].sort();
    for (const day of touchedDays) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`${salonId ?? "legacy"}:${day}`]
      );
    }

    await client.query(
      salonId ? "DELETE FROM blocked_times WHERE salon_id = $1" : "DELETE FROM blocked_times",
      salonId ? [salonId] : []
    );

    // Reason column (migration 027) is absent until the runner applies it —
    // omit it on old schemas instead of 500ing the whole save.
    const { rows: reasonCols } = await client.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'blocked_times' AND column_name = 'reason' LIMIT 1`
    );
    const hasReason = reasonCols.length > 0;

    if (blockedTimes && blockedTimes.length > 0) {
      for (const b of blockedTimes) {
        const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 100) : "";
        await client.query(
          salonId
            ? `INSERT INTO blocked_times (salon_id, date_gregorian, start_time, end_time${hasReason ? ", reason" : ""}) VALUES ($1, $2, $3, $4${hasReason ? ", $5" : ""})`
            : `INSERT INTO blocked_times (date_gregorian, start_time, end_time${hasReason ? ", reason" : ""}) VALUES ($1, $2, $3${hasReason ? ", $4" : ""})`,
          salonId
            ? hasReason ? [salonId, b.date_gregorian, b.start_time, b.end_time, reason] : [salonId, b.date_gregorian, b.start_time, b.end_time]
            : hasReason ? [b.date_gregorian, b.start_time, b.end_time, reason] : [b.date_gregorian, b.start_time, b.end_time]
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
