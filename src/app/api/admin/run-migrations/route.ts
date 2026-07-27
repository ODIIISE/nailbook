import { NextRequest, NextResponse } from "next/server";
import { runMigrations } from "@/lib/db/migrate";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const results = await runMigrations();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("run-migrations error:", message, error);
    return NextResponse.json({ error: "خطای سرور", detail: message }, { status: 500 });
  }
}
