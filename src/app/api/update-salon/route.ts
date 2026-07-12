import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const updates = await request.json();

    const { rows: existing } = await sql`SELECT id FROM salon_info LIMIT 1`;
    if (!existing[0]) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const salonId = existing[0].id;

    // Update each field individually using tagged template literals
    if (updates.name !== undefined) {
      await sql`UPDATE salon_info SET name = ${updates.name} WHERE id = ${salonId}`;
    }
    if (updates.description !== undefined) {
      await sql`UPDATE salon_info SET description = ${updates.description} WHERE id = ${salonId}`;
    }
    if (updates.slogan !== undefined) {
      await sql`UPDATE salon_info SET slogan = ${updates.slogan} WHERE id = ${salonId}`;
    }
    if (updates.phone !== undefined) {
      await sql`UPDATE salon_info SET phone = ${updates.phone} WHERE id = ${salonId}`;
    }
    if (updates.address !== undefined) {
      await sql`UPDATE salon_info SET address = ${updates.address} WHERE id = ${salonId}`;
    }
    if (updates.hero_image_url !== undefined) {
      await sql`UPDATE salon_info SET hero_image_url = ${updates.hero_image_url} WHERE id = ${salonId}`;
    }
    if (updates.logo_url !== undefined) {
      await sql`UPDATE salon_info SET logo_url = ${updates.logo_url} WHERE id = ${salonId}`;
    }
    if (updates.working_hours_text !== undefined) {
      await sql`UPDATE salon_info SET working_hours_text = ${updates.working_hours_text} WHERE id = ${salonId}`;
    }
    if (updates.working_hours !== undefined) {
      await sql`UPDATE salon_info SET working_hours = ${JSON.stringify(updates.working_hours)}::jsonb WHERE id = ${salonId}`;
    }
    if (updates.specific_days_off !== undefined) {
      await sql`UPDATE salon_info SET specific_days_off = ${JSON.stringify(updates.specific_days_off)}::jsonb WHERE id = ${salonId}`;
    }
    if (updates.slot_buffer_minutes !== undefined) {
      await sql`UPDATE salon_info SET slot_buffer_minutes = ${updates.slot_buffer_minutes} WHERE id = ${salonId}`;
    }
    if (updates.slot_interval_minutes !== undefined) {
      await sql`UPDATE salon_info SET slot_interval_minutes = ${updates.slot_interval_minutes} WHERE id = ${salonId}`;
    }
    if (updates.early_extra_hours !== undefined) {
      await sql`UPDATE salon_info SET early_extra_hours = ${updates.early_extra_hours} WHERE id = ${salonId}`;
    }
    if (updates.late_extra_hours !== undefined) {
      await sql`UPDATE salon_info SET late_extra_hours = ${updates.late_extra_hours} WHERE id = ${salonId}`;
    }
    if (updates.expand_threshold !== undefined) {
      await sql`UPDATE salon_info SET expand_threshold = ${updates.expand_threshold} WHERE id = ${salonId}`;
    }
    if (updates.proximity_window_hours !== undefined) {
      await sql`UPDATE salon_info SET proximity_window_hours = ${updates.proximity_window_hours} WHERE id = ${salonId}`;
    }
    if (updates.allow_overflow !== undefined) {
      await sql`UPDATE salon_info SET allow_overflow = ${updates.allow_overflow} WHERE id = ${salonId}`;
    }
    if (updates.overflow_minutes !== undefined) {
      await sql`UPDATE salon_info SET overflow_minutes = ${updates.overflow_minutes} WHERE id = ${salonId}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
