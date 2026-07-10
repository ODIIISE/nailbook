import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

const ALLOWED_FIELDS = [
  "name", "description", "slogan", "phone", "address",
  "hero_image_url", "logo_url", "working_hours_text",
  "working_hours", "specific_days_off",
  "slot_buffer_minutes", "slot_interval_minutes",
  "early_extra_hours", "late_extra_hours", "expand_threshold",
];

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const updates = await request.json();

    const safeUpdates: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.includes(key)) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
    }

    const { rows: existing } = await sql`SELECT id FROM salon_info LIMIT 1`;
    if (!existing[0]) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(safeUpdates)) {
      sets.push(`${key} = $${idx}`);
      values.push(typeof val === "object" ? JSON.stringify(val) : val);
      idx++;
    }

    await sql.query(`UPDATE salon_info SET ${sets.join(", ")} WHERE id = $${idx}`, [...values, existing[0].id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
