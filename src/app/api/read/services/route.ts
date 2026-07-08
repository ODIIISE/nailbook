import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const { rows } = await sql`SELECT * FROM services ORDER BY sort_order`;
    return NextResponse.json(rows.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      duration_minutes: s.duration_minutes,
      price: s.price,
      is_active: s.is_active,
      sort_order: s.sort_order,
      addon_ids: s.addon_ids || [],
      priority_score: s.priority_score || 5,
    })));
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
