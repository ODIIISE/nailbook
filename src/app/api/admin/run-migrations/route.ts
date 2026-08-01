import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdmin } from "@/lib/super-admin-auth";
import { runMigrations } from "@/lib/db/migrate";

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

    const results = await runMigrations();
    return NextResponse.json({
      success: results.every((result) => result.success),
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
