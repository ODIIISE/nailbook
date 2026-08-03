import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getSalonId } from "@/lib/multi-tenant";

export async function GET() {
  try {
    const salonId = getSalonId();
    const { rows } = salonId
      ? await sql.query(
          `SELECT id, name, price, duration_minutes, is_active, sort_order
           FROM addons WHERE salon_id = $1 ORDER BY sort_order`,
          [salonId]
        )
      : await sql`
          SELECT id, name, price, duration_minutes, is_active, sort_order
          FROM addons ORDER BY sort_order
        `;
    return NextResponse.json(rows.map((a) => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      duration_minutes: Number(a.duration_minutes),
      is_active: a.is_active,
      sort_order: a.sort_order || 0,
    })));
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
