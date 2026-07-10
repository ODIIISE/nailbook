import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const results: string[] = [];

    // Add early_extra_hours column
    try {
      await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS early_extra_hours INT DEFAULT 0`;
      results.push("early_extra_hours ✓");
    } catch (e) {
      results.push(`early_extra_hours: ${String(e)}`);
    }

    // Add late_extra_hours column
    try {
      await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS late_extra_hours INT DEFAULT 0`;
      results.push("late_extra_hours ✓");
    } catch (e) {
      results.push(`late_extra_hours: ${String(e)}`);
    }

    // Add expand_threshold column
    try {
      await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS expand_threshold INT DEFAULT 80`;
      results.push("expand_threshold ✓");
    } catch (e) {
      results.push(`expand_threshold: ${String(e)}`);
    }

    // Verify columns exist
    const { rows } = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'salon_info' 
      AND column_name IN ('early_extra_hours', 'late_extra_hours', 'expand_threshold')
    `;

    return NextResponse.json({
      success: true,
      results,
      columnsFound: rows.map((r) => r.column_name),
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: "خطای سرور: " + String(error) }, { status: 500 });
  }
}
