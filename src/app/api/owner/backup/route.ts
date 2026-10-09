import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireStaff, staffAuthError } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { resolveSalonId } from "@/lib/multi-tenant";
import { normalizeDaysOffReasons } from "@/lib/salon-settings";
import { normalizeLacquer } from "@/lib/types";

interface BackupService {
  id: string;
  name: string;
  description?: string;
  duration_minutes?: number;
  price?: number;
  is_active?: boolean;
  sort_order?: number;
  addon_ids?: string[];
  priority_score?: number;
  lacquer?: unknown;
}

interface BackupAddon {
  id: string;
  name: string;
  price?: number;
  duration_minutes?: number;
  is_active?: boolean;
  sort_order?: number;
}

interface BackupBooking {
  id: string;
  service_id?: string;
  selected_addons?: string[];
  customer_name?: string;
  customer_phone: string;
  date?: string;
  date_gregorian: string;
  start_time: string;
  end_time: string;
  status?: string;
  paid?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  artist_id?: unknown;
  note?: unknown;
}

interface BackupSalonInfo {
  name?: string;
  description?: string;
  slogan?: string;
  phone?: string;
  address?: string;
  working_hours?: Record<string, { open: string; close: string } | null>;
  working_hours_text?: string;
  slot_buffer_minutes?: number;
  slot_interval_minutes?: number;
  specific_days_off?: string[];
  early_extra_hours?: number;
  late_extra_hours?: number;
  expand_threshold?: number;
  proximity_window_hours?: number;
  allow_overflow?: boolean;
  overflow_minutes?: number;
  optimization_mode?: "hybrid" | "legacy";
  suggestion_limit?: number;
  min_useful_gap_minutes?: number;
  cancel_hours?: unknown;
  lead_minutes?: unknown;
  days_off_reasons?: unknown;
}

interface BackupData {
  salon_info?: BackupSalonInfo[];
  services?: unknown[];
  addons?: unknown[];
  bookings?: unknown[];
}

// GET: Export all salon data as JSON backup
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request, "users.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });
    const staff = auth.staff;

    const salonId = await resolveSalonId();
    // Users export carries roles + profile columns when migrated; the base
    // list keeps pre-migration databases working.
    const usersBase = "id, phone, name, role, created_at";
    const usersFull = `${usersBase}, roles, specialty, work_days, service_ids, sms_reminders, offers, note, lacquer`;
    const fetchUsers = async () => {
      try {
        return salonId
          ? await sql.query(`SELECT ${usersFull} FROM users WHERE salon_id = $1 ORDER BY created_at`, [salonId])
          : await sql.query(`SELECT ${usersFull} FROM users ORDER BY created_at`);
      } catch (error) {
        const code = (error as { code?: string })?.code;
        const message = String((error as { message?: string })?.message || "");
        if (code !== "42703" && !/column .* does not exist/i.test(message)) throw error;
        return salonId
          ? await sql.query(`SELECT ${usersBase} FROM users WHERE salon_id = $1 ORDER BY created_at`, [salonId])
          : await sql.query(`SELECT ${usersBase} FROM users ORDER BY created_at`);
      }
    };
    const [salonInfo, services, addons, bookings, blockedTimes, users, highlights] = await Promise.all(
      salonId
        ? [
            sql.query("SELECT * FROM salons WHERE id = $1", [salonId]),
            sql.query("SELECT * FROM services WHERE salon_id = $1 ORDER BY sort_order", [salonId]),
            sql.query("SELECT * FROM addons WHERE salon_id = $1 ORDER BY sort_order", [salonId]),
            sql.query("SELECT * FROM bookings WHERE salon_id = $1 ORDER BY created_at DESC", [salonId]),
            sql.query("SELECT * FROM blocked_times WHERE salon_id = $1 ORDER BY date_gregorian", [salonId]),
            fetchUsers(),
            sql.query("SELECT * FROM highlights WHERE salon_id = $1 ORDER BY sort_order", [salonId]),
          ]
        : [
            sql`SELECT * FROM salon_info`,
            sql`SELECT * FROM services ORDER BY sort_order`,
            sql`SELECT * FROM addons ORDER BY sort_order`,
            sql`SELECT * FROM bookings ORDER BY created_at DESC`,
            sql`SELECT * FROM blocked_times ORDER BY date_gregorian`,
            fetchUsers(),
            sql`SELECT * FROM highlights ORDER BY sort_order`,
          ]
    );

    const backup = {
      version: "1.1",
      exportedAt: new Date().toISOString(),
      exportedBy: staff.id,
      salonId,
      data: {
        salon_info: salonInfo.rows,
        services: services.rows,
        addons: addons.rows,
        bookings: bookings.rows,
        blocked_times: blockedTimes.rows,
        users: users.rows,
        highlights: highlights.rows,
      },
    };

    return NextResponse.json(backup, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="nailbook-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup export error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

function validateBooking(b: unknown): b is BackupBooking {
  if (!b || typeof b !== "object") return false;
  const booking = b as BackupBooking;
  if (!booking.id || typeof booking.id !== "string") return false;
  if (!booking.customer_phone || typeof booking.customer_phone !== "string") return false;
  if (!booking.date_gregorian || !/^\d{4}-\d{2}-\d{2}$/.test(booking.date_gregorian)) return false;
  if (!booking.start_time || !/^\d{2}:\d{2}/.test(booking.start_time)) return false;
  if (!booking.end_time || !/^\d{2}:\d{2}/.test(booking.end_time)) return false;
  // "noshow" rides the bookings_status_check constraint (migration 029);
  // anything outside the supported set would fail the whole transaction.
  // Map unknown legacy values to the closest supported state instead.
  const validStatuses = ["pending", "reserved", "confirmed", "completed", "cancelled", "in_progress", "noshow"];
  if (booking.status && !validStatuses.includes(booking.status)) return false;
  return true;
}

function validateService(s: unknown): s is BackupService {
  if (!s || typeof s !== "object") return false;
  const service = s as BackupService;
  if (!service.id || typeof service.id !== "string") return false;
  if (!service.name || typeof service.name !== "string" || !service.name.trim()) return false;
  if (typeof service.duration_minutes === "number" && (service.duration_minutes <= 0 || !Number.isFinite(service.duration_minutes))) return false;
  return true;
}

function validateAddon(a: unknown): a is BackupAddon {
  if (!a || typeof a !== "object") return false;
  const addon = a as BackupAddon;
  if (!addon.id || typeof addon.id !== "string") return false;
  if (!addon.name || typeof addon.name !== "string" || !addon.name.trim()) return false;
  return true;
}

/** Columns of `table` restricted to `names` — empty set on any failure,
 *  so restores omit unknown columns instead of aborting the transaction. */
async function tableColumns(table: string, names: string[]): Promise<Set<string>> {
  try {
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2)`,
      [table, names]
    );
    return new Set(rows.map((r) => String(r.column_name)));
  } catch {
    return new Set();
  }
}

// POST: Restore from JSON backup (partial or full)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaff(request, "users.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });

    const salonId = await resolveSalonId();
    const { data, mode = "merge", confirmDelete = false } = await request.json() as { data?: BackupData; mode?: string; confirmDelete?: boolean };
    if (!data || typeof data !== "object") return NextResponse.json({ error: "داده‌ای ارسال نشد" }, { status: 400 });

    // Require explicit confirmation for destructive operations
    if (mode === "full" && !confirmDelete) {
      return NextResponse.json({
        error: "بازیابی کامل نیاز به تأیید دارد",
        requiresConfirmation: true,
        bookingCount: Array.isArray(data.bookings) ? data.bookings.length : 0,
      }, { status: 409 });
    }

    const results: string[] = [];
    const errors: string[] = [];

    // Lacquer columns (migration 030) may be absent on older targets —
    // probe once so restores omit them instead of failing per row.
    const withServiceLacquer = (await tableColumns("services", ["lacquer"])).has("lacquer");

    // Restore services (with validation)
    if (data.services && Array.isArray(data.services)) {
      for (const s of data.services) {
        if (!validateService(s)) {
          errors.push(`service:invalid:${(s as { id?: string }).id || "unknown"}`);
          continue;
        }
        try {
          // Lacquer rides only when the column exists (migration 030).
          const svcCols = withServiceLacquer ? ", lacquer" : "";
          const svcVals = (s: BackupService, base: unknown[]) =>
            withServiceLacquer ? [...base, normalizeLacquer(s.lacquer)] : base;
          if (salonId) {
            const base = [s.id, salonId, s.name, s.description || "", Math.max(5, Number(s.duration_minutes) || 45), Math.max(0, Number(s.price) || 0), s.is_active ?? true, Number(s.sort_order) || 0, JSON.stringify(s.addon_ids || []), Math.min(10, Math.max(1, Number(s.priority_score) || 5))];
            await sql.query(
              `INSERT INTO services (id, salon_id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score${svcCols})
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10${withServiceLacquer ? ", $11" : ""})
               ON CONFLICT (id) DO UPDATE SET
                 name = $3, description = $4, duration_minutes = $5, price = $6,
                 is_active = $7, sort_order = $8, addon_ids = $9, priority_score = $10${withServiceLacquer ? ", lacquer = $11" : ""}
               WHERE services.salon_id = EXCLUDED.salon_id`,
              svcVals(s, base)
            );
          } else {
            await sql`
              INSERT INTO services (id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score)
              VALUES (${s.id}, ${s.name}, ${s.description || ""}, ${Math.max(5, Number(s.duration_minutes) || 45)}, ${Math.max(0, Number(s.price) || 0)}, ${s.is_active ?? true}, ${Number(s.sort_order) || 0}, ${JSON.stringify(s.addon_ids || [])}, ${Math.min(10, Math.max(1, Number(s.priority_score) || 5))})
              ON CONFLICT (id) DO UPDATE SET
                name = ${s.name}, description = ${s.description || ""}, duration_minutes = ${Math.max(5, Number(s.duration_minutes) || 45)},
                price = ${Math.max(0, Number(s.price) || 0)}, is_active = ${s.is_active ?? true}, sort_order = ${Number(s.sort_order) || 0},
                addon_ids = ${JSON.stringify(s.addon_ids || [])}, priority_score = ${Math.min(10, Math.max(1, Number(s.priority_score) || 5))}
            `;
            if (withServiceLacquer) {
              await sql.query(`UPDATE services SET lacquer = $1 WHERE id = $2`, [normalizeLacquer(s.lacquer), s.id]);
            }
          }
          results.push(`service:${s.id}`);
        } catch {
          errors.push(`service:${s.id}`);
        }
      }
    }

    // Restore addons (with validation)
    if (data.addons && Array.isArray(data.addons)) {
      for (const a of data.addons) {
        if (!validateAddon(a)) {
          errors.push(`addon:invalid:${(a as { id?: string }).id || "unknown"}`);
          continue;
        }
        try {
          if (salonId) {
            await sql.query(
              `INSERT INTO addons (id, salon_id, name, price, duration_minutes, is_active, sort_order)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 name = $3, price = $4, duration_minutes = $5, is_active = $6, sort_order = $7
               WHERE addons.salon_id = EXCLUDED.salon_id`,
              [a.id, salonId, a.name, Math.max(0, Number(a.price) || 0), Math.max(0, Number(a.duration_minutes) || 5), a.is_active ?? true, Number(a.sort_order) || 0]
            );
          } else {
            await sql`
              INSERT INTO addons (id, name, price, duration_minutes, is_active, sort_order)
              VALUES (${a.id}, ${a.name}, ${Math.max(0, Number(a.price) || 0)}, ${Math.max(0, Number(a.duration_minutes) || 5)}, ${a.is_active ?? true}, ${Number(a.sort_order) || 0})
              ON CONFLICT (id) DO UPDATE SET
                name = ${a.name}, price = ${Math.max(0, Number(a.price) || 0)}, duration_minutes = ${Math.max(0, Number(a.duration_minutes) || 5)},
                is_active = ${a.is_active ?? true}, sort_order = ${Number(a.sort_order) || 0}
            `;
          }
          results.push(`addon:${a.id}`);
        } catch {
          errors.push(`addon:${a.id}`);
        }
      }
    }

    // Restore salon info
    if (data.salon_info && Array.isArray(data.salon_info) && data.salon_info[0]) {
      const s = data.salon_info[0];
      try {
        const values: unknown[] = [
          s.name || "", s.description || "", s.slogan || "", s.phone || "", s.address || "",
          JSON.stringify(s.working_hours || {}), s.working_hours_text || "",
          Math.max(0, Number(s.slot_buffer_minutes) || 15), Math.max(5, Number(s.slot_interval_minutes) || 15),
          JSON.stringify(s.specific_days_off || []), Math.min(8, Math.max(0, Number(s.early_extra_hours) || 0)),
          Math.min(8, Math.max(0, Number(s.late_extra_hours) || 0)), Math.min(100, Math.max(0, Number(s.expand_threshold) || 80)),
          Math.max(0, Number(s.proximity_window_hours) || 2), s.allow_overflow ?? false, Math.max(0, Number(s.overflow_minutes) || 0),
          s.optimization_mode === "legacy" ? "legacy" : "hybrid", Math.min(10, Math.max(1, Number(s.suggestion_limit) || 3)),
          Math.min(180, Math.max(0, Number(s.min_useful_gap_minutes) || 30)),
        ];
        let setClause = `name = $1, description = $2, slogan = $3, phone = $4, address = $5,
             working_hours = $6::jsonb, working_hours_text = $7, slot_buffer_minutes = $8, slot_interval_minutes = $9,
             specific_days_off = $10${salonId ? "::jsonb" : ""}, early_extra_hours = $11, late_extra_hours = $12, expand_threshold = $13,
             proximity_window_hours = $14, allow_overflow = $15, overflow_minutes = $16, optimization_mode = $17,
             suggestion_limit = $18, min_useful_gap_minutes = $19`;
        // Policy extras (027): same bounds as update-salon; omitted when the
        // backup predates them or the target schema lacks the columns.
        const policyTable = salonId ? "salons" : "salon_info";
        const policyCols = await tableColumns(policyTable, ["cancel_hours", "lead_minutes", "days_off_reasons"]);
        const cancelV = Number(s.cancel_hours);
        if (s.cancel_hours !== undefined && policyCols.has("cancel_hours")
          && Number.isInteger(cancelV) && cancelV >= 0 && cancelV <= 72) {
          values.push(cancelV);
          setClause += `, cancel_hours = $${values.length}`;
        }
        const leadV = Number(s.lead_minutes);
        if (s.lead_minutes !== undefined && policyCols.has("lead_minutes")
          && Number.isInteger(leadV) && leadV >= 0 && leadV <= 240) {
          values.push(leadV);
          setClause += `, lead_minutes = $${values.length}`;
        }
        if (s.days_off_reasons !== undefined && policyCols.has("days_off_reasons")) {
          values.push(JSON.stringify(normalizeDaysOffReasons(s.days_off_reasons)));
          setClause += `, days_off_reasons = $${values.length}`;
        }
        if (salonId) {
          values.push(salonId);
          await sql.query(
            `UPDATE salons SET ${setClause} WHERE id = $${values.length}`,
            values
          );
        } else {
          await sql.query(
            `UPDATE salon_info SET ${setClause} WHERE id = (SELECT id FROM salon_info LIMIT 1)`,
            values
          );
        }
        results.push("salon_info");
      } catch {
        errors.push("salon_info");
      }
    }

    // Restore bookings (only in full restore mode with confirmation)
    if (mode === "full" && data.bookings && Array.isArray(data.bookings)) {
      const validBookings = data.bookings.filter(validateBooking);
      if (validBookings.length < data.bookings.length) {
        errors.push(`bookings:skipped:${data.bookings.length - validBookings.length} invalid`);
      }

      // artist_id / note ride only when the columns exist; artist links are
      // re-pointed at live users (users are never restored, so a stale id
      // would violate the FK — map it to unassigned instead of failing).
      const bookingCols = await tableColumns("bookings", ["artist_id", "note"]);
      const withArtist = bookingCols.has("artist_id");
      const withNote = bookingCols.has("note");
      let liveArtistIds = new Set<string>();
      if (withArtist) {
        try {
          const { rows: artistRows } = salonId
            ? await sql.query(`SELECT id FROM users WHERE salon_id = $1`, [salonId])
            : await sql`SELECT id FROM users`;
          liveArtistIds = new Set(artistRows.map((r) => String(r.id)));
        } catch {
          liveArtistIds = new Set();
        }
      }
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const extraCols = [...(withArtist ? ["artist_id"] : []), ...(withNote ? ["note"] : [])];

      let client;
      try {
        client = await sql.connect();
        await client.query("BEGIN");
        await client.query(
          salonId ? "DELETE FROM bookings WHERE salon_id = $1" : "DELETE FROM bookings",
          salonId ? [salonId] : []
        );
        for (const b of validBookings) {
          try {
            const artistValue = withArtist
              && typeof b.artist_id === "string"
              && UUID_RE.test(b.artist_id)
              && liveArtistIds.has(b.artist_id)
              ? b.artist_id
              : null;
            const noteValue = withNote && typeof b.note === "string" ? b.note.slice(0, 500) : "";
            const baseCols = salonId
              ? ["id", "salon_id", "service_id", "selected_addons", "customer_name", "customer_phone", "date", "date_gregorian", "start_time", "end_time", "status", "paid", "phone_verified", "created_at"]
              : ["id", "service_id", "selected_addons", "customer_name", "customer_phone", "date", "date_gregorian", "start_time", "end_time", "status", "paid", "phone_verified", "created_at"];
            const baseVals: unknown[] = salonId
              ? [b.id, salonId, b.service_id || null, JSON.stringify(b.selected_addons || []), b.customer_name || "", b.customer_phone, b.date || null, b.date_gregorian, b.start_time, b.end_time, b.status || "confirmed", b.paid ?? false, b.phone_verified ?? true, b.created_at || new Date().toISOString()]
              : [b.id, b.service_id || null, JSON.stringify(b.selected_addons || []), b.customer_name || "", b.customer_phone, b.date || null, b.date_gregorian, b.start_time, b.end_time, b.status || "confirmed", b.paid ?? false, b.phone_verified ?? true, b.created_at || new Date().toISOString()];
            const extraVals: unknown[] = extraCols.map((c) => (c === "artist_id" ? artistValue : noteValue));
            const allCols = [...baseCols, ...extraCols];
            const placeholders = [...baseVals, ...extraVals].map((_, i) => {
              const col = allCols[i];
              if (col === "date_gregorian") return `$${i + 1}::date`;
              return `$${i + 1}`;
            });
            await client.query(
              `INSERT INTO bookings (${allCols.join(", ")}) VALUES (${placeholders.join(", ")})`,
              [...baseVals, ...extraVals]
            );
            results.push(`booking:${b.id}`);
          } catch {
            errors.push(`booking:${b.id}`);
          }
        }
        await client.query("COMMIT");
      } catch {
        if (client) try { await client.query("ROLLBACK"); } catch {}
        errors.push("bookings:transaction_failed");
      } finally {
        if (client) client.release();
      }
    }

    logActivity({
      eventType: "salon_updated",
      entityType: "backup",
      description: `بکاپ بازیابی شد (${results.length} آیتم, ${errors.length} خطا)`,
      metadata: { restored: results.length, errors: errors.length, mode, items: results.slice(0, 20) },
    });

    return NextResponse.json({ success: true, restored: results.length, errors });
  } catch (error) {
    console.error("Backup restore error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
