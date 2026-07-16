import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const { rows } = await sql`
      SELECT id, name, description, duration_minutes, price, is_active, sort_order, addon_ids, priority_score
      FROM services ORDER BY sort_order
    `;
    return NextResponse.json(rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration_minutes: Number(s.duration_minutes),
      price: Number(s.price),
      is_active: s.is_active,
      sort_order: s.sort_order,
      addon_ids: s.addon_ids || [],
      priority_score: Number(s.priority_score) || 5,
    })));
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
