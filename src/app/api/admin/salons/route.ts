import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { rows } = await sql`
      SELECT id, name, slug, phone, address, is_active, created_at,
        (SELECT COUNT(*) FROM users WHERE salon_id = salons.id) as user_count,
        (SELECT COUNT(*) FROM bookings WHERE salon_id = salons.id) as booking_count
      FROM salons
      ORDER BY created_at DESC
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Fetch salons error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { name, phone, address, slug } = await request.json();
    if (!name) return NextResponse.json({ error: "نام سالن الزامی است" }, { status: 400 });

    const salonSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    const { rows } = await sql`
      INSERT INTO salons (name, slug, phone, address)
      VALUES (${name}, ${salonSlug}, ${phone || null}, ${address || null})
      RETURNING id, name, slug
    `;

    return NextResponse.json({ success: true, salon: rows[0] });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "این slug قبلاً استفاده شده" }, { status: 409 });
    }
    console.error("Create salon error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
