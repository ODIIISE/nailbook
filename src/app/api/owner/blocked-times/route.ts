import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireStaff, staffAuthError, isSalonArtist } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { resolveSalonId } from "@/lib/multi-tenant";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function blockExtras(): Promise<Set<string>> {
  try {
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'blocked_times'
       AND column_name IN ('reason', 'artist_id')`
    );
    return new Set(rows.map((r) => String(r.column_name)));
  } catch {
    return new Set();
  }
}

function isValidBlockedTime(b: unknown): b is BlockedTimeItem {
  const item = b as BlockedTimeItem;
  return !!item
    && typeof item.date_gregorian === "string" && ISO_DATE.test(item.date_gregorian)
    && typeof item.start_time === "string" && HH_MM.test(item.start_time)
    && typeof item.end_time === "string" && HH_MM.test(item.end_time)
    && item.end_time > item.start_time
    && (item.reason === undefined || typeof item.reason === "string")
    && (item.artist_id === undefined || item.artist_id === null || item.artist_id === ""
      || (typeof item.artist_id === "string" && UUID_RE.test(item.artist_id)));
}

interface BlockedTimeItem {
  date_gregorian: string;
  start_time: string;
  end_time: string;
  /** Free-text reason (migration 027). Optional; capped at 100 chars on write. */
  reason?: string;
  /** Assigned artist (migration 028). Null/empty = whole salon. */
  artist_id?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request, "schedule.edit");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });

    const salonId = await resolveSalonId();
    const extras = await blockExtras();
    const extraSelect = [...extras].map((c) => `, ${c}`).join("");
    const result = salonId
      ? await sql.query(`SELECT date_gregorian, start_time, end_time${extraSelect} FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian`, [salonId])
      : await sql.query(`SELECT date_gregorian, start_time, end_time${extraSelect} FROM blocked_times ORDER BY date_gregorian`);
    return NextResponse.json({ blockedTimes: result.rows });
  } catch {
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let client;
  try {
    const auth = await requireStaff(request, "schedule.edit");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });

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
    // Assigned artists must exist (checked outside the transaction).
    for (const b of blockedTimes) {
      const artistId = typeof b.artist_id === "string" && b.artist_id ? b.artist_id : null;
      if (artistId && !(await isSalonArtist(artistId, salonId))) {
        return NextResponse.json({ error: "هنرمند یافت نشد" }, { status: 400 });
      }
    }
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

    // Reason (027) and artist (028) columns are absent until the runner
    // applies them — omit them on old schemas instead of 500ing the save.
    // The slot engine treats every block as salon-wide regardless.
    const extras = await blockExtras();
    const hasReason = extras.has("reason");
    const hasArtist = extras.has("artist_id");

    if (blockedTimes && blockedTimes.length > 0) {
      for (const b of blockedTimes) {
        const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 100) : "";
        const artistId = typeof b.artist_id === "string" && b.artist_id ? b.artist_id : null;
        const extraCols: string[] = [];
        const extraVals: unknown[] = [];
        if (hasReason) {
          extraCols.push("reason");
          extraVals.push(reason);
        }
        if (hasArtist) {
          extraCols.push("artist_id");
          extraVals.push(artistId);
        }
        const extraColsSql = extraCols.length ? `, ${extraCols.join(", ")}` : "";
        const baseCount = salonId ? 4 : 3;
        const extraPlaceholders = extraVals.map((_, i) => `, $${baseCount + i + 1}`).join("");
        await client.query(
          salonId
            ? `INSERT INTO blocked_times (salon_id, date_gregorian, start_time, end_time${extraColsSql}) VALUES ($1, $2, $3, $4${extraPlaceholders})`
            : `INSERT INTO blocked_times (date_gregorian, start_time, end_time${extraColsSql}) VALUES ($1, $2, $3${extraPlaceholders})`,
          salonId
            ? [salonId, b.date_gregorian, b.start_time, b.end_time, ...extraVals]
            : [b.date_gregorian, b.start_time, b.end_time, ...extraVals]
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
