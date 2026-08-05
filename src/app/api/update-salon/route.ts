import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";
import { isValidSpecificDaysOff, isValidWorkingHours } from "@/lib/salon-settings";

const SALON_INFO_TABLE = "salon_info";
const SALONS_TABLE = "salons";

function getSettingsTable() {
  return getSalonId() ? SALONS_TABLE : SALON_INFO_TABLE;
}

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const updates = await request.json();

    // Allowlist: only accept known fields
    const ALLOWED_FIELDS = new Set([
      "name", "description", "slogan", "phone", "address", "city", "instagram_handle", "portrait_image_url",
      "hero_image_url", "logo_url", "splash_title", "splash_slogan", "splash_logo_url", "working_hours_text",
      "working_hours", "specific_days_off",
      "slot_buffer_minutes", "slot_interval_minutes",
      "early_extra_hours", "late_extra_hours",
      "expand_threshold", "proximity_window_hours",
      "allow_overflow", "overflow_minutes",
      "optimization_mode", "suggestion_limit", "min_useful_gap_minutes",
    ]);

    // Strip unknown fields
    const safeUpdates: Record<string, unknown> = {};
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
      { key: "suggestion_limit", min: 1, max: 10 },
      { key: "min_useful_gap_minutes", min: 0, max: 180 },
    ];
    if (safeUpdates.optimization_mode !== undefined && safeUpdates.optimization_mode !== "hybrid" && safeUpdates.optimization_mode !== "legacy") {
      return NextResponse.json({ error: "حالت هوشمندسازی نامعتبر است" }, { status: 400 });
    }

    for (const { key, min, max } of numericValidations) {
      if (safeUpdates[key] !== undefined) {
        const v = Number(safeUpdates[key]);
        if (!Number.isInteger(v) || v < min || v > max) return NextResponse.json({ error: "مقدار نامعتبر" }, { status: 400 });
        safeUpdates[key] = v; // coerce to proper number
      }
    }

    if (safeUpdates.allow_overflow !== undefined && typeof safeUpdates.allow_overflow !== "boolean") {
      return NextResponse.json({ error: "مقدار تمدید ساعت نامعتبر است" }, { status: 400 });
    }
    if (safeUpdates.working_hours !== undefined && !isValidWorkingHours(safeUpdates.working_hours)) {
      return NextResponse.json({ error: "ساعات کاری نامعتبر است" }, { status: 400 });
    }
    if (safeUpdates.specific_days_off !== undefined && !isValidSpecificDaysOff(safeUpdates.specific_days_off)) {
      return NextResponse.json({ error: "روزهای تعطیل نامعتبر است" }, { status: 400 });
    }

    const configuredSalonId = getSalonId();
    const settingsTable = getSettingsTable();
    const existing = configuredSalonId
      ? await sql.query(`SELECT id FROM ${settingsTable} WHERE id = $1 LIMIT 1`, [configuredSalonId])
      : await sql.query(`SELECT id FROM ${settingsTable} LIMIT 1`);
    if (!existing.rows[0]) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const salonId = existing.rows[0].id;

    // Wrap all updates in a transaction for atomicity
    let client;
    try {
      client = await sql.connect();
      await client.query("BEGIN");

      // Update each field individually using tagged template literals
      const updateTable = getSettingsTable();
      const updateSql = (column: string) => `UPDATE ${updateTable} SET ${column} = $1 WHERE id = $2`;

      if (safeUpdates.name !== undefined) {
        await client.query(updateSql("name"), [safeUpdates.name, salonId]);
      }
      if (safeUpdates.description !== undefined) {
        await client.query(updateSql("description"), [safeUpdates.description, salonId]);
      }
      if (safeUpdates.slogan !== undefined) {
        await client.query(updateSql("slogan"), [safeUpdates.slogan, salonId]);
      }
      if (safeUpdates.phone !== undefined) {
        await client.query(updateSql("phone"), [safeUpdates.phone, salonId]);
      }
      if (safeUpdates.address !== undefined) {
        await client.query(updateSql("address"), [safeUpdates.address, salonId]);
      }
      if (safeUpdates.city !== undefined) {
        await client.query(updateSql("city"), [safeUpdates.city, salonId]);
      }
      if (safeUpdates.instagram_handle !== undefined) {
        await client.query(updateSql("instagram_handle"), [safeUpdates.instagram_handle, salonId]);
      }
      if (safeUpdates.portrait_image_url !== undefined) {
        await client.query(updateSql("portrait_image_url"), [safeUpdates.portrait_image_url, salonId]);
      }
      if (safeUpdates.hero_image_url !== undefined) {
        await client.query(updateSql("hero_image_url"), [safeUpdates.hero_image_url, salonId]);
      }
      if (safeUpdates.logo_url !== undefined) {
        await client.query(updateSql("logo_url"), [safeUpdates.logo_url, salonId]);
      }
      if (safeUpdates.splash_title !== undefined) {
        await client.query("UPDATE salon_info SET splash_title = $1 WHERE id = $2", [safeUpdates.splash_title, salonId]);
      }
      if (safeUpdates.splash_slogan !== undefined) {
        await client.query("UPDATE salon_info SET splash_slogan = $1 WHERE id = $2", [safeUpdates.splash_slogan, salonId]);
      }
      if (safeUpdates.splash_logo_url !== undefined) {
        await client.query("UPDATE salon_info SET splash_logo_url = $1 WHERE id = $2", [safeUpdates.splash_logo_url, salonId]);
      }
      if (safeUpdates.working_hours_text !== undefined) {
        await client.query(updateSql("working_hours_text"), [safeUpdates.working_hours_text, salonId]);
      }
      if (safeUpdates.working_hours !== undefined) {
        await client.query(updateSql("working_hours"), [JSON.stringify(safeUpdates.working_hours), salonId]);
      }
      if (safeUpdates.specific_days_off !== undefined) {
        const daysOffValue = getSalonId()
          ? JSON.stringify(safeUpdates.specific_days_off)
          : safeUpdates.specific_days_off;
        await client.query(updateSql("specific_days_off"), [daysOffValue, salonId]);
      }
      if (safeUpdates.slot_buffer_minutes !== undefined) {
        await client.query(updateSql("slot_buffer_minutes"), [safeUpdates.slot_buffer_minutes, salonId]);
      }
      if (safeUpdates.slot_interval_minutes !== undefined) {
        await client.query(updateSql("slot_interval_minutes"), [safeUpdates.slot_interval_minutes, salonId]);
      }
      if (safeUpdates.early_extra_hours !== undefined) {
        await client.query(updateSql("early_extra_hours"), [safeUpdates.early_extra_hours, salonId]);
      }
      if (safeUpdates.late_extra_hours !== undefined) {
        await client.query(updateSql("late_extra_hours"), [safeUpdates.late_extra_hours, salonId]);
      }
      if (safeUpdates.expand_threshold !== undefined) {
        await client.query(updateSql("expand_threshold"), [safeUpdates.expand_threshold, salonId]);
      }
      if (safeUpdates.proximity_window_hours !== undefined) {
        await client.query(updateSql("proximity_window_hours"), [safeUpdates.proximity_window_hours, salonId]);
      }
      if (safeUpdates.allow_overflow !== undefined) {
        await client.query(updateSql("allow_overflow"), [safeUpdates.allow_overflow, salonId]);
      }
      if (safeUpdates.overflow_minutes !== undefined) {
        await client.query(updateSql("overflow_minutes"), [safeUpdates.overflow_minutes, salonId]);
      }
      if (safeUpdates.optimization_mode !== undefined) {
        await client.query(updateSql("optimization_mode"), [safeUpdates.optimization_mode, salonId]);
      }
      if (safeUpdates.suggestion_limit !== undefined) {
        await client.query(updateSql("suggestion_limit"), [safeUpdates.suggestion_limit, salonId]);
      }
      if (safeUpdates.min_useful_gap_minutes !== undefined) {
        await client.query(updateSql("min_useful_gap_minutes"), [safeUpdates.min_useful_gap_minutes, salonId]);
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
