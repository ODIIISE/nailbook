import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const updates = await request.json();

    // Allowlist: only accept known fields
    const ALLOWED_FIELDS = new Set([
      "name", "description", "slogan", "phone", "address",
      "hero_image_url", "logo_url", "working_hours_text",
      "working_hours", "specific_days_off",
      "slot_buffer_minutes", "slot_interval_minutes",
      "early_extra_hours", "late_extra_hours",
      "expand_threshold", "proximity_window_hours",
      "allow_overflow", "overflow_minutes",
    ]);

    // Strip unknown fields
    const safeUpdates: Record<string, any> = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.has(key)) safeUpdates[key] = updates[key];
    }

    // Validate numeric fields and coerce to proper numbers
    const numericValidations: Array<{ key: string; min: number; max: number }> = [
      { key: "slot_buffer_minutes", min: 0, max: 120 },
      { key: "slot_interval_minutes", min: 5, max: 60 },
      { key: "expand_threshold", min: 0, max: 100 },
      { key: "proximity_window_hours", min: 0, max: 48 },
      { key: "early_extra_hours", min: 0, max: 8 },
      { key: "late_extra_hours", min: 0, max: 8 },
      { key: "overflow_minutes", min: 0, max: 120 },
    ];
    for (const { key, min, max } of numericValidations) {
      if (safeUpdates[key] !== undefined) {
        const v = Number(safeUpdates[key]);
        if (isNaN(v) || v < min || v > max) return NextResponse.json({ error: "مقدار نامعتبر" }, { status: 400 });
        safeUpdates[key] = v; // coerce to proper number
      }
    }

    const { rows: existing } = await sql`SELECT id FROM salon_info LIMIT 1`;
    if (!existing[0]) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const salonId = existing[0].id;

    // Wrap all updates in a transaction for atomicity
    let client;
    try {
      client = await sql.connect();
      await client.query("BEGIN");

      // Update each field individually using tagged template literals
      if (safeUpdates.name !== undefined) {
        await client.query("UPDATE salon_info SET name = $1 WHERE id = $2", [safeUpdates.name, salonId]);
      }
      if (safeUpdates.description !== undefined) {
        await client.query("UPDATE salon_info SET description = $1 WHERE id = $2", [safeUpdates.description, salonId]);
      }
      if (safeUpdates.slogan !== undefined) {
        await client.query("UPDATE salon_info SET slogan = $1 WHERE id = $2", [safeUpdates.slogan, salonId]);
      }
      if (safeUpdates.phone !== undefined) {
        await client.query("UPDATE salon_info SET phone = $1 WHERE id = $2", [safeUpdates.phone, salonId]);
      }
      if (safeUpdates.address !== undefined) {
        await client.query("UPDATE salon_info SET address = $1 WHERE id = $2", [safeUpdates.address, salonId]);
      }
      if (safeUpdates.hero_image_url !== undefined) {
        await client.query("UPDATE salon_info SET hero_image_url = $1 WHERE id = $2", [safeUpdates.hero_image_url, salonId]);
      }
      if (safeUpdates.logo_url !== undefined) {
        await client.query("UPDATE salon_info SET logo_url = $1 WHERE id = $2", [safeUpdates.logo_url, salonId]);
      }
      if (safeUpdates.working_hours_text !== undefined) {
        await client.query("UPDATE salon_info SET working_hours_text = $1 WHERE id = $2", [safeUpdates.working_hours_text, salonId]);
      }
      if (safeUpdates.working_hours !== undefined) {
        await client.query("UPDATE salon_info SET working_hours = $1 WHERE id = $2", [JSON.stringify(safeUpdates.working_hours), salonId]);
      }
      if (safeUpdates.specific_days_off !== undefined) {
        await client.query("UPDATE salon_info SET specific_days_off = $1 WHERE id = $2", [JSON.stringify(safeUpdates.specific_days_off), salonId]);
      }
      if (safeUpdates.slot_buffer_minutes !== undefined) {
        await client.query("UPDATE salon_info SET slot_buffer_minutes = $1 WHERE id = $2", [safeUpdates.slot_buffer_minutes, salonId]);
      }
      if (safeUpdates.slot_interval_minutes !== undefined) {
        await client.query("UPDATE salon_info SET slot_interval_minutes = $1 WHERE id = $2", [safeUpdates.slot_interval_minutes, salonId]);
      }
      if (safeUpdates.early_extra_hours !== undefined) {
        await client.query("UPDATE salon_info SET early_extra_hours = $1 WHERE id = $2", [safeUpdates.early_extra_hours, salonId]);
      }
      if (safeUpdates.late_extra_hours !== undefined) {
        await client.query("UPDATE salon_info SET late_extra_hours = $1 WHERE id = $2", [safeUpdates.late_extra_hours, salonId]);
      }
      if (safeUpdates.expand_threshold !== undefined) {
        await client.query("UPDATE salon_info SET expand_threshold = $1 WHERE id = $2", [safeUpdates.expand_threshold, salonId]);
      }
      if (safeUpdates.proximity_window_hours !== undefined) {
        await client.query("UPDATE salon_info SET proximity_window_hours = $1 WHERE id = $2", [safeUpdates.proximity_window_hours, salonId]);
      }
      if (safeUpdates.allow_overflow !== undefined) {
        await client.query("UPDATE salon_info SET allow_overflow = $1 WHERE id = $2", [safeUpdates.allow_overflow, salonId]);
      }
      if (safeUpdates.overflow_minutes !== undefined) {
        await client.query("UPDATE salon_info SET overflow_minutes = $1 WHERE id = $2", [safeUpdates.overflow_minutes, salonId]);
      }

      await client.query("COMMIT");
    } catch (e) {
      if (client) try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      if (client) client.release();
    }

    // Determine what was updated for logging
    const updatedFields = Object.keys(safeUpdates).filter((k) => safeUpdates[k] !== undefined);
    if (updatedFields.length > 0) {
      logActivity({
        eventType: "salon_updated",
        entityType: "salon",
        description: `تنظیمات سالن به‌روزرسانی شد`,
        metadata: { fields: updatedFields },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
