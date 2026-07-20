import { NextRequest, NextResponse } from "next/server";
import { verifyOwner } from "@/lib/owner-auth";
import { getMigrationStatus } from "@/lib/db/migrate";

// GET: Check migration status (read-only — no write migrations via API)
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
