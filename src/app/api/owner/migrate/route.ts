import { NextRequest, NextResponse } from "next/server";
import { requireStaff, staffAuthError } from "@/lib/owner-auth";
import { getMigrationStatus } from "@/lib/db/migrate";

// GET: Check migration status (read-only — no write migrations via API)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaff(request, "users.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });

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
