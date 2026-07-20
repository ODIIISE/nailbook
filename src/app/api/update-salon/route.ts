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

    // Update each field individually using tagged template literals
    if (safeUpdates.name !== undefined) {
      await sql`UPDATE salon_info SET name = ${safeUpdates.name} WHERE id = ${salonId}`;
    }
    if (safeUpdates.description !== undefined) {
      await sql`UPDATE salon_info SET description = ${safeUpdates.description} WHERE id = ${salonId}`;
    }
    if (safeUpdates.slogan !== undefined) {
      await sql`UPDATE salon_info SET slogan = ${safeUpdates.slogan} WHERE id = ${salonId}`;
    }
    if (safeUpdates.phone !== undefined) {
      await sql`UPDATE salon_info SET phone = ${safeUpdates.phone} WHERE id = ${salonId}`;
    }
    if (safeUpdates.address !== undefined) {
      await sql`UPDATE salon_info SET address = ${safeUpdates.address} WHERE id = ${salonId}`;
    }
    if (safeUpdates.hero_image_url !== undefined) {
      await sql`UPDATE salon_info SET hero_image_url = ${safeUpdates.hero_image_url} WHERE id = ${salonId}`;
    }
    if (safeUpdates.logo_url !== undefined) {
      await sql`UPDATE salon_info SET logo_url = ${safeUpdates.logo_url} WHERE id = ${salonId}`;
    }
    if (safeUpdates.working_hours_text !== undefined) {
      await sql`UPDATE salon_info SET working_hours_text = ${safeUpdates.working_hours_text} WHERE id = ${salonId}`;
    }
    if (safeUpdates.working_hours !== undefined) {
      await sql`UPDATE salon_info SET working_hours = ${JSON.stringify(safeUpdates.working_hours)}::jsonb WHERE id = ${salonId}`;
    }
    if (safeUpdates.specific_days_off !== undefined) {
      await sql`UPDATE salon_info SET specific_days_off = ${JSON.stringify(safeUpdates.specific_days_off)}::jsonb WHERE id = ${salonId}`;
    }
    if (safeUpdates.slot_buffer_minutes !== undefined) {
      await sql`UPDATE salon_info SET slot_buffer_minutes = ${safeUpdates.slot_buffer_minutes} WHERE id = ${salonId}`;
    }
    if (safeUpdates.slot_interval_minutes !== undefined) {
      await sql`UPDATE salon_info SET slot_interval_minutes = ${safeUpdates.slot_interval_minutes} WHERE id = ${salonId}`;
    }
    if (safeUpdates.early_extra_hours !== undefined) {
      await sql`UPDATE salon_info SET early_extra_hours = ${safeUpdates.early_extra_hours} WHERE id = ${salonId}`;
    }
    if (safeUpdates.late_extra_hours !== undefined) {
      await sql`UPDATE salon_info SET late_extra_hours = ${safeUpdates.late_extra_hours} WHERE id = ${salonId}`;
    }
    if (safeUpdates.expand_threshold !== undefined) {
      await sql`UPDATE salon_info SET expand_threshold = ${safeUpdates.expand_threshold} WHERE id = ${salonId}`;
    }
    if (safeUpdates.proximity_window_hours !== undefined) {
      await sql`UPDATE salon_info SET proximity_window_hours = ${safeUpdates.proximity_window_hours} WHERE id = ${salonId}`;
    }
    if (safeUpdates.allow_overflow !== undefined) {
      await sql`UPDATE salon_info SET allow_overflow = ${safeUpdates.allow_overflow} WHERE id = ${salonId}`;
    }
    if (safeUpdates.overflow_minutes !== undefined) {
      await sql`UPDATE salon_info SET overflow_minutes = ${safeUpdates.overflow_minutes} WHERE id = ${salonId}`;
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
