import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

/**
 * POST /api/admin/run-migrations — Track pending SQL migrations from src/db/migrations/.
 * Super-admin only. The checked-in SQL is applied through the deployment/database
 * migration workflow; this endpoint records operator-confirmed runs.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    const { rows: applied } = await sql`SELECT filename FROM _migrations ORDER BY id`;
    const appliedSet = new Set(applied.map((r) => r.filename));
    const migrations = [
      "001_initial_schema.sql",
      "002_atomic_booking.sql",
      "003_add_salon_engine_columns.sql",
      "004_activity_logs.sql",
      "005_add_reserved_status.sql",
      "006_add_session_version.sql",
      "007_cleanup_dead_tables.sql",
      "008_unique_index_reserved_status.sql",
      "009_multi_tenant_schema.sql",
      "010_otp_schema.sql",
      "011_add_splash_fields.sql",
      "012_waitlist_and_portfolio.sql",
      "013_fix_users_pin_null.sql",
      "014_multi_role_users.sql",
      "015_services_images_and_best_for.sql",
      "016_patch_legacy_role_owner.sql",
    ];

    const results: Array<{ name: string; success: boolean; error?: string }> = [];
    for (const filename of migrations) {
      if (appliedSet.has(filename)) continue;
      try {
        await sql`INSERT INTO _migrations (filename) VALUES (${filename}) ON CONFLICT (filename) DO NOTHING`;
        results.push({ name: filename, success: true });
      } catch (error) {
        results.push({
          name: filename,
          success: false,
          error: error instanceof Error ? error.message : "error",
        });
      }
    }

    return NextResponse.json({
      success: results.every((result) => result.success),
      results,
      total: migrations.length,
      skipped: appliedSet.size,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
