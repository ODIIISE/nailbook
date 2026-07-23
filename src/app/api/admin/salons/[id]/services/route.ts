import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id } = await params;

    const { rows } = await sql`
      SELECT id, name, description, duration_minutes, price, is_active, sort_order
      FROM services
      WHERE salon_id = ${id}
      ORDER BY sort_order ASC
    `;

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Fetch services error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
