import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const results: string[] = [];

    try { await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS early_extra_hours INT DEFAULT 0`; results.push("early_extra_hours ✓"); } catch (e) { results.push(`early_extra_hours: ${String(e)}`); }
    try { await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS late_extra_hours INT DEFAULT 0`; results.push("late_extra_hours ✓"); } catch (e) { results.push(`late_extra_hours: ${String(e)}`); }
    try { await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS expand_threshold INT DEFAULT 80`; results.push("expand_threshold ✓"); } catch (e) { results.push(`expand_threshold: ${String(e)}`); }
    try { await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS proximity_window_hours INT DEFAULT 2`; results.push("proximity_window_hours ✓"); } catch (e) { results.push(`proximity_window_hours: ${String(e)}`); }
    try { await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS allow_overflow BOOLEAN DEFAULT false`; results.push("allow_overflow ✓"); } catch (e) { results.push(`allow_overflow: ${String(e)}`); }
    try { await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS slot_interval_minutes INT DEFAULT 15`; results.push("slot_interval_minutes ✓"); } catch (e) { results.push(`slot_interval_minutes: ${String(e)}`); }
    try { await sql`ALTER TABLE salon_info ADD COLUMN IF NOT EXISTS slot_buffer_minutes INT DEFAULT 0`; results.push("slot_buffer_minutes ✓"); } catch (e) { results.push(`slot_buffer_minutes: ${String(e)}`); }

    const { rows } = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'salon_info'
      AND column_name IN ('early_extra_hours', 'late_extra_hours', 'expand_threshold', 'proximity_window_hours', 'allow_overflow', 'slot_interval_minutes', 'slot_buffer_minutes')
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
