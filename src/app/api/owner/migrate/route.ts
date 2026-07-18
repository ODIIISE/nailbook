import { NextRequest, NextResponse } from "next/server";
import { verifyOwner } from "@/lib/owner-auth";
import { runMigrations, getMigrationStatus } from "@/lib/db/migrate";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const results = await runMigrations();
    const applied = results.filter((r) => r.success).length;

    if (applied > 0) {
      logActivity({
        eventType: "database_migrated",
        entityType: "system",
        description: `${applied} مایگریشن اجرا شد`,
        metadata: { applied, failed: results.filter((r) => !r.success).length },
      });
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        applied: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const status = await getMigrationStatus();

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("Migration status error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
