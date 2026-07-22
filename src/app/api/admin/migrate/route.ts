import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const results: string[] = [];

    // Create salons table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS salons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          phone TEXT,
          address TEXT,
          description TEXT DEFAULT '',
          slogan TEXT DEFAULT '',
          hero_image_url TEXT,
          logo_url TEXT,
          working_hours JSONB DEFAULT '{}',
          working_hours_text TEXT DEFAULT '',
          specific_days_off JSONB DEFAULT '[]',
          slot_buffer_minutes INTEGER DEFAULT 0,
          slot_interval_minutes INTEGER DEFAULT 15,
          early_extra_hours INTEGER DEFAULT 0,
          late_extra_hours INTEGER DEFAULT 0,
          expand_threshold INTEGER DEFAULT 80,
          proximity_window_hours INTEGER DEFAULT 2,
          allow_overflow BOOLEAN DEFAULT false,
          overflow_minutes INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      results.push("salons table created");
    } catch (e: any) {
      results.push(`salons: ${e.message}`);
    }

    // Create super_admins table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS super_admins (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          phone TEXT UNIQUE NOT NULL,
          pin TEXT NOT NULL,
          name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      results.push("super_admins table created");
    } catch (e: any) {
      results.push(`super_admins: ${e.message}`);
    }

    // Add salon_id columns
    const tables = ["users", "services", "addons", "bookings", "blocked_times", "highlights", "highlight_images", "activity_logs"];
    for (const table of tables) {
      try {
        await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id)`);
        results.push(`${table}.salon_id added`);
      } catch (e: any) {
        results.push(`${table}.salon_id: ${e.message}`);
      }
    }

    // Create indexes
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_users_salon ON users(salon_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_services_salon ON services(salon_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_bookings_salon_date ON bookings(salon_id, date_gregorian)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_blocked_times_salon ON blocked_times(salon_id)`;
      results.push("indexes created");
    } catch (e: any) {
      results.push(`indexes: ${e.message}`);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to run migration" });
}
