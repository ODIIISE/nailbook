import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// Auto-migrate: run DDL on first read per instance
let migrated = false;
async function ensureSchema() {
  if (migrated) return;
  try {
    // Add reserved status to bookings CHECK constraint
    await sql`ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check`;
    await sql`ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'reserved', 'confirmed', 'in_progress', 'completed', 'cancelled'))`;
    await sql`ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'reserved'`;
    migrated = true;
  } catch {
    // Table may not exist yet — skip silently
  }
}

export async function GET() {
  try {
    await ensureSchema();

    const { rows } = await sql`SELECT * FROM salon_info LIMIT 1`;
    if (!rows[0]) return NextResponse.json(null);
    const s = rows[0];
    return NextResponse.json({
      id: s.id,
      name: s.name,
      description: s.description,
      slogan: s.slogan || "",
      phone: s.phone,
      address: s.address,
      hero_image_url: s.hero_image_url,
      logo_url: s.logo_url,
      working_hours_text: s.working_hours_text || "شنبه تا پنج شنبه . ۱۰ تا ۱۸",
      working_hours: s.working_hours,
      slot_buffer_minutes: s.slot_buffer_minutes ?? 0,
      slot_interval_minutes: s.slot_interval_minutes ?? 15,
      early_extra_hours: s.early_extra_hours ?? 0,
      late_extra_hours: s.late_extra_hours ?? 0,
      expand_threshold: s.expand_threshold ?? 80,
      proximity_window_hours: s.proximity_window_hours ?? 2,
      allow_overflow: s.allow_overflow ?? false,
      overflow_minutes: s.overflow_minutes ?? 0,
      specific_days_off: s.specific_days_off,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
