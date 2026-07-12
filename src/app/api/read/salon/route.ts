import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// Auto-migrate: add missing columns on first read
let migrated = false;
async function ensureColumns() {
  if (migrated) return;
  try {
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS early_extra_hours INT DEFAULT 0`;
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS late_extra_hours INT DEFAULT 0`;
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS expand_threshold INT DEFAULT 80`;
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS proximity_window_hours INT DEFAULT 2`;
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS allow_overflow BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS overflow_minutes INT DEFAULT 0`;
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS slot_interval_minutes INT DEFAULT 15`;
    await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS slot_buffer_minutes INT DEFAULT 0`;
    migrated = true;
  } catch {
    // Columns may already exist or table may not exist yet — skip silently
  }
}

export async function GET() {
  try {
    await ensureColumns();

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
