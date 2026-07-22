import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

/**
 * Import existing single-salon data into multi-tenant system.
 * This is a one-time operation that:
 * 1. Reads existing salon_info data
 * 2. Creates a salon record
 * 3. Backfills salon_id on all existing tables
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { name, slug } = await request.json();
    if (!name) return NextResponse.json({ error: "نام سالن الزامی است" }, { status: 400 });

    const results: string[] = [];

    // 1. Read existing salon_info
    let info: any;
    try {
      const { rows: salonInfo } = await sql`SELECT * FROM salon_info LIMIT 1`;
      if (salonInfo.length === 0) {
        return NextResponse.json({ error: "داده salon_info یافت نشد" }, { status: 404 });
      }
      info = salonInfo[0];
      results.push("salon_info خوانده شد");
    } catch (e: any) {
      return NextResponse.json({ error: `خطا در خواندن salon_info: ${e.message}` }, { status: 500 });
    }

    // 2. Ensure salons table has all required columns (ALTER if needed)
    const salonColumns = [
      { name: "description", type: "TEXT DEFAULT ''" },
      { name: "slogan", type: "TEXT DEFAULT ''" },
      { name: "hero_image_url", type: "TEXT" },
      { name: "logo_url", type: "TEXT" },
      { name: "working_hours", type: "JSONB DEFAULT '{}'" },
      { name: "working_hours_text", type: "TEXT DEFAULT ''" },
      { name: "specific_days_off", type: "JSONB DEFAULT '[]'" },
      { name: "slot_buffer_minutes", type: "INTEGER DEFAULT 0" },
      { name: "slot_interval_minutes", type: "INTEGER DEFAULT 15" },
      { name: "early_extra_hours", type: "INTEGER DEFAULT 0" },
      { name: "late_extra_hours", type: "INTEGER DEFAULT 0" },
      { name: "expand_threshold", type: "INTEGER DEFAULT 80" },
      { name: "proximity_window_hours", type: "INTEGER DEFAULT 2" },
      { name: "allow_overflow", type: "BOOLEAN DEFAULT false" },
      { name: "overflow_minutes", type: "INTEGER DEFAULT 0" },
    ];

    for (const col of salonColumns) {
      try {
        await sql.query(`ALTER TABLE salons ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
      } catch (e: any) {
        // Column might already exist, that's fine
      }
    }
    results.push("ستون‌های salons بررسی شد");

    // 3. Create salon record from existing data
    const salonSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    // Handle specific_days_off type (TEXT[] in salon_info, JSONB in salons)
    let specificDaysOff = "[]";
    try {
      if (Array.isArray(info.specific_days_off)) {
        specificDaysOff = JSON.stringify(info.specific_days_off);
      } else if (typeof info.specific_days_off === "string") {
        specificDaysOff = info.specific_days_off;
      }
    } catch {
      specificDaysOff = "[]";
    }

    // Handle working_hours type (JSONB in both)
    let workingHours = "{}";
    try {
      if (info.working_hours && typeof info.working_hours === "object") {
        workingHours = JSON.stringify(info.working_hours);
      }
    } catch {
      workingHours = "{}";
    }

    let salonRows: any[];
    try {
      const result = await sql`
        INSERT INTO salons (
          name, slug, phone, address, description, slogan,
          hero_image_url, logo_url, working_hours, working_hours_text,
          specific_days_off, slot_buffer_minutes, slot_interval_minutes,
          early_extra_hours, late_extra_hours, expand_threshold,
          proximity_window_hours, allow_overflow, overflow_minutes
        ) VALUES (
          ${name}, ${salonSlug},
          ${info.phone || null}, ${info.address || null},
          ${info.description || ""}, ${info.slogan || ""},
          ${info.hero_image_url || null}, ${info.logo_url || null},
          ${workingHours}::jsonb, ${info.working_hours_text || ""},
          ${specificDaysOff}::jsonb,
          ${info.slot_buffer_minutes || 0}, ${info.slot_interval_minutes || 15},
          ${info.early_extra_hours || 0}, ${info.late_extra_hours || 0},
          ${info.expand_threshold || 80}, ${info.proximity_window_hours || 2},
          ${info.allow_overflow || false}, ${info.overflow_minutes || 0}
        )
        RETURNING id, name, slug
      `;
      salonRows = result.rows;
      results.push(`سالن "${name}" ایجاد شد (ID: ${salonRows[0].id})`);
    } catch (e: any) {
      return NextResponse.json({ error: `خطا در ایجاد سالن: ${e.message}` }, { status: 500 });
    }

    const salonId = salonRows[0].id;

    // 4. Ensure salon_id columns exist on all tables
    const tables = [
      "users", "services", "addons", "bookings",
      "blocked_times", "highlights", "highlight_images", "activity_logs"
    ];

    for (const table of tables) {
      try {
        await sql.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS salon_id UUID REFERENCES salons(id)`);
        results.push(`${table}: salon_id اضافه شد`);
      } catch (e: any) {
        // Column might already exist, that's OK
        if (!e.message?.includes("already exists")) {
          results.push(`${table}: ${e.message}`);
        }
      }
    }

    // 5. Backfill salon_id on all existing tables
    for (const table of tables) {
      try {
        const { rowCount } = await sql.query(
          `UPDATE ${table} SET salon_id = $1 WHERE salon_id IS NULL`,
          [salonId]
        );
        results.push(`${table}: ${rowCount} ردیف به‌روزرسانی شد`);
      } catch (e: any) {
        results.push(`${table}: ${e.message}`);
      }
    }

    // 6. Create indexes
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_users_salon ON users(salon_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_services_salon ON services(salon_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_bookings_salon_date ON bookings(salon_id, date_gregorian)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_blocked_times_salon ON blocked_times(salon_id)`;
      results.push("ایندکس‌ها ایجاد شد");
    } catch (e: any) {
      results.push(`ایندکس‌ها: ${e.message}`);
    }

    return NextResponse.json({
      success: true,
      salon: salonRows[0],
      results,
    });
  } catch (error) {
    console.error("Import salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to import salon" });
}
