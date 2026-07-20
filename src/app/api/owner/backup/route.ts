import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

// GET: Export all salon data as JSON backup
export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    // Fetch all data in parallel
    const [salonInfo, services, addons, bookings, blockedTimes, users, highlights] = await Promise.all([
      sql`SELECT * FROM salon_info`,
      sql`SELECT * FROM services ORDER BY sort_order`,
      sql`SELECT * FROM addons ORDER BY sort_order`,
      sql`SELECT id, service_id, selected_addons, customer_name, customer_phone, date, date_gregorian, start_time, end_time, status, paid, phone_verified, created_at FROM bookings ORDER BY created_at DESC`,
      sql`SELECT * FROM blocked_times ORDER BY date_gregorian`,
      sql`SELECT id, phone, name, role, created_at FROM users ORDER BY created_at`,
      sql`SELECT * FROM highlights ORDER BY sort_order`,
    ]);

    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      exportedBy: owner.id,
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

function validateBooking(b: any): boolean {
  if (!b || typeof b !== "object") return false;
  if (!b.id || typeof b.id !== "string") return false;
  if (!b.customer_phone || typeof b.customer_phone !== "string") return false;
  if (!b.date_gregorian || !/^\d{4}-\d{2}-\d{2}$/.test(b.date_gregorian)) return false;
  if (!b.start_time || !/^\d{2}:\d{2}/.test(b.start_time)) return false;
  if (!b.end_time || !/^\d{2}:\d{2}/.test(b.end_time)) return false;
  const validStatuses = ["pending", "reserved", "confirmed", "completed", "cancelled", "in_progress", "no_show"];
  if (b.status && !validStatuses.includes(b.status)) return false;
  return true;
}

function validateService(s: any): boolean {
  if (!s || typeof s !== "object") return false;
  if (!s.id || typeof s.id !== "string") return false;
  if (!s.name || typeof s.name !== "string" || !s.name.trim()) return false;
  if (typeof s.duration_minutes === "number" && (s.duration_minutes <= 0 || !Number.isFinite(s.duration_minutes))) return false;
  return true;
}

// POST: Restore from JSON backup (partial or full)
export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { data, mode = "merge", confirmDelete = false } = await request.json();
    if (!data || typeof data !== "object") return NextResponse.json({ error: "داده‌ای ارسال نشد" }, { status: 400 });

    // Require explicit confirmation for destructive operations
    if (mode === "full" && !confirmDelete) {
      return NextResponse.json({
        error: "بازیابی کامل نیاز به تایید دارد",
        requiresConfirmation: true,
        bookingCount: Array.isArray(data.bookings) ? data.bookings.length : 0,
      }, { status: 409 });
    }

    const results: string[] = [];
    const errors: string[] = [];

    // Restore services (with validation)
    if (data.services && Array.isArray(data.services)) {
      for (const s of data.services) {
        if (!validateService(s)) {
          errors.push(`service:invalid:${s?.id || "unknown"}`);
          continue;
        }
        try {
          await sql`
            INSERT INTO services (id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score)
            VALUES (${s.id}, ${s.name}, ${s.description || ""}, ${Math.max(5, Number(s.duration_minutes) || 45)}, ${Math.max(0, Number(s.price) || 0)}, ${s.is_active ?? true}, ${Number(s.sort_order) || 0}, ${JSON.stringify(s.addon_ids || [])}, ${Math.min(10, Math.max(1, Number(s.priority_score) || 5))})
            ON CONFLICT (id) DO UPDATE SET
              name = ${s.name}, description = ${s.description || ""}, duration_minutes = ${Math.max(5, Number(s.duration_minutes) || 45)},
              price = ${Math.max(0, Number(s.price) || 0)}, is_active = ${s.is_active ?? true}, sort_order = ${Number(s.sort_order) || 0},
              addon_ids = ${JSON.stringify(s.addon_ids || [])}, priority_score = ${Math.min(10, Math.max(1, Number(s.priority_score) || 5))}
          `;
          results.push(`service:${s.id}`);
        } catch (e) {
          errors.push(`service:${s.id}`);
        }
      }
    }

    // Restore addons (with validation)
    if (data.addons && Array.isArray(data.addons)) {
      for (const a of data.addons) {
        if (!a?.id || !a?.name) {
          errors.push(`addon:invalid:${a?.id || "unknown"}`);
          continue;
        }
        try {
          await sql`
            INSERT INTO addons (id, name, price, duration_minutes, is_active, sort_order)
            VALUES (${a.id}, ${a.name}, ${Math.max(0, Number(a.price) || 0)}, ${Math.max(0, Number(a.duration_minutes) || 5)}, ${a.is_active ?? true}, ${Number(a.sort_order) || 0})
            ON CONFLICT (id) DO UPDATE SET
              name = ${a.name}, price = ${Math.max(0, Number(a.price) || 0)}, duration_minutes = ${Math.max(0, Number(a.duration_minutes) || 5)},
              is_active = ${a.is_active ?? true}, sort_order = ${Number(a.sort_order) || 0}
          `;
          results.push(`addon:${a.id}`);
        } catch (e) {
          errors.push(`addon:${a.id}`);
        }
      }
    }

    // Restore salon info
    if (data.salon_info && Array.isArray(data.salon_info) && data.salon_info[0]) {
      const s = data.salon_info[0];
      try {
        await sql`
          UPDATE salon_info SET
            name = ${s.name || ""}, description = ${s.description || ""}, slogan = ${s.slogan || ""},
            phone = ${s.phone || ""}, address = ${s.address || ""}, working_hours = ${JSON.stringify(s.working_hours || {})},
            working_hours_text = ${s.working_hours_text || ""}, slot_buffer_minutes = ${Math.max(0, Number(s.slot_buffer_minutes) || 15)},
            slot_interval_minutes = ${Math.max(5, Number(s.slot_interval_minutes) || 15)}, specific_days_off = ${JSON.stringify(s.specific_days_off || [])},
            proximity_window_hours = ${Math.max(0, Number(s.proximity_window_hours) || 2)}, allow_overflow = ${s.allow_overflow ?? false},
            overflow_minutes = ${Math.max(0, Number(s.overflow_minutes) || 0)}
          WHERE id = (SELECT id FROM salon_info LIMIT 1)
        `;
        results.push("salon_info");
      } catch (e) {
        errors.push("salon_info");
      }
    }

    // Restore bookings (only in full restore mode with confirmation)
    if (mode === "full" && data.bookings && Array.isArray(data.bookings)) {
      const validBookings = data.bookings.filter(validateBooking);
      if (validBookings.length < data.bookings.length) {
        errors.push(`bookings:skipped:${data.bookings.length - validBookings.length} invalid`);
      }

      let client;
      try {
        client = await sql.connect();
        await client.query("BEGIN");
        await client.query("DELETE FROM bookings");
        for (const b of validBookings) {
          try {
            await client.query(
              `INSERT INTO bookings (id, service_id, selected_addons, customer_name, customer_phone, date, date_gregorian, start_time, end_time, status, paid, phone_verified, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10, $11, $12, $13)`,
              [b.id, b.service_id || null, JSON.stringify(b.selected_addons || []), b.customer_name || "", b.customer_phone, b.date || null, b.date_gregorian, b.start_time, b.end_time, b.status || "confirmed", b.paid ?? false, b.phone_verified ?? true, b.created_at || new Date().toISOString()]
            );
            results.push(`booking:${b.id}`);
          } catch (e) {
            errors.push(`booking:${b.id}`);
          }
        }
        await client.query("COMMIT");
      } catch (e) {
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
