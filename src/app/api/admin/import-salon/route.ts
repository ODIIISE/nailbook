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
    const { rows: salonInfo } = await sql`SELECT * FROM salon_info LIMIT 1`;
    if (salonInfo.length === 0) {
      return NextResponse.json({ error: "داده salon_info یافت نشد" }, { status: 404 });
    }
    const info = salonInfo[0];
    results.push("salon_info خوانده شد");

    // 2. Create salon record from existing data
    const salonSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const { rows: salonRows } = await sql`
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
        ${JSON.stringify(info.working_hours || {})}, ${info.working_hours_text || ""},
        ${JSON.stringify(info.specific_days_off || [])},
        ${info.slot_buffer_minutes || 0}, ${info.slot_interval_minutes || 15},
        ${info.early_extra_hours || 0}, ${info.late_extra_hours || 0},
        ${info.expand_threshold || 80}, ${info.proximity_window_hours || 2},
        ${info.allow_overflow || false}, ${info.overflow_minutes || 0}
      )
      RETURNING id, name, slug
    `;
    const salonId = salonRows[0].id;
    results.push(`سالن "${name}" ایجاد شد (ID: ${salonId})`);

    // 3. Backfill salon_id on all existing tables
    const tables = [
      "users", "services", "addons", "bookings",
      "blocked_times", "highlights", "highlight_images", "activity_logs"
    ];

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
