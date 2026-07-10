import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

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
      sql`SELECT id, phone, name, role, failed_attempts, locked_until, created_at FROM users ORDER BY created_at`,
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

    // Return as downloadable JSON
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

// POST: Restore from JSON backup (partial or full)
export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { data, mode = "merge" } = await request.json();
    if (!data) return NextResponse.json({ error: "داده‌ای ارسال نشد" }, { status: 400 });

    const results: string[] = [];

    // Restore services
    if (data.services && Array.isArray(data.services)) {
      for (const s of data.services) {
        try {
          await sql`
            INSERT INTO services (id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score)
            VALUES (${s.id}, ${s.name}, ${s.description || ""}, ${s.duration_minutes || 45}, ${s.price || 0}, ${s.is_active ?? true}, ${s.sort_order || 0}, ${JSON.stringify(s.addon_ids || [])}, ${s.priority_score || 5})
            ON CONFLICT (id) DO UPDATE SET
              name = ${s.name}, description = ${s.description || ""}, duration_minutes = ${s.duration_minutes || 45},
              price = ${s.price || 0}, is_active = ${s.is_active ?? true}, sort_order = ${s.sort_order || 0},
              addon_ids = ${JSON.stringify(s.addon_ids || [])}, priority_score = ${s.priority_score || 5}
          `;
          results.push(`service:${s.id}`);
        } catch (e) {
          console.error(`Failed to restore service ${s.id}:`, e);
        }
      }
    }

    // Restore addons
    if (data.addons && Array.isArray(data.addons)) {
      for (const a of data.addons) {
        try {
          await sql`
            INSERT INTO addons (id, name, price, duration_minutes, is_active, sort_order)
            VALUES (${a.id}, ${a.name}, ${a.price || 0}, ${a.duration_minutes || 5}, ${a.is_active ?? true}, ${a.sort_order || 0})
            ON CONFLICT (id) DO UPDATE SET
              name = ${a.name}, price = ${a.price || 0}, duration_minutes = ${a.duration_minutes || 5},
              is_active = ${a.is_active ?? true}, sort_order = ${a.sort_order || 0}
          `;
          results.push(`addon:${a.id}`);
        } catch (e) {
          console.error(`Failed to restore addon ${a.id}:`, e);
        }
      }
    }

    // Restore salon info
    if (data.salon_info && Array.isArray(data.salon_info) && data.salon_info[0]) {
      const s = data.salon_info[0];
      try {
        await sql`
          UPDATE salon_info SET
            name = ${s.name}, description = ${s.description || ""}, slogan = ${s.slogan || ""},
            phone = ${s.phone || ""}, address = ${s.address || ""}, working_hours = ${JSON.stringify(s.working_hours || {})},
            working_hours_text = ${s.working_hours_text || ""}, slot_buffer_minutes = ${s.slot_buffer_minutes || 15},
            slot_interval_minutes = ${s.slot_interval_minutes || 15}, specific_days_off = ${JSON.stringify(s.specific_days_off || [])}
          WHERE id = (SELECT id FROM salon_info LIMIT 1)
        `;
        results.push("salon_info");
      } catch (e) {
        console.error("Failed to restore salon info:", e);
      }
    }

    // Restore bookings (only in full restore mode)
    if (mode === "full" && data.bookings && Array.isArray(data.bookings)) {
      // Clear existing bookings first
      await sql`DELETE FROM bookings`;
      for (const b of data.bookings) {
        try {
          await sql`
            INSERT INTO bookings (id, service_id, selected_addons, customer_name, customer_phone, date, date_gregorian, start_time, end_time, status, paid, phone_verified, created_at)
            VALUES (${b.id}, ${b.service_id}, ${JSON.stringify(b.selected_addons || [])}, ${b.customer_name}, ${b.customer_phone}, ${b.date}, ${b.date_gregorian}::date, ${b.start_time}, ${b.end_time}, ${b.status || "confirmed"}, ${b.paid ?? false}, ${b.phone_verified ?? true}, ${b.created_at || new Date().toISOString()})
          `;
          results.push(`booking:${b.id}`);
        } catch (e) {
          console.error(`Failed to restore booking ${b.id}:`, e);
        }
      }
    }

    return NextResponse.json({ success: true, restored: results.length, items: results });
  } catch (error) {
    console.error("Backup restore error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
