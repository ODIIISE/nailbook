import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id } = await params;

    const existingCheck = await sql`SELECT COUNT(*) FROM services WHERE salon_id = ${id}`;
    if (Number(existingCheck.rows[0].count) > 0) {
      return NextResponse.json({
        success: true,
        services: [],
        message: "خدمات از قبل وجود دارد",
      });
    }

    const defaults = [
      { name: "کاشت ناخن", duration_minutes: 90, price: 350000 },
      { name: "ترمیم ناخن", duration_minutes: 60, price: 250000 },
      { name: "ژل پولیش", duration_minutes: 45, price: 150000 },
      { name: "پدیکور", duration_minutes: 60, price: 200000 },
      { name: "مانیکور", duration_minutes: 45, price: 150000 },
    ];

    const inserted = [];
    for (const svc of defaults) {
      const result = await sql`
        INSERT INTO services (salon_id, name, duration_minutes, price, is_active)
        VALUES (${id}, ${svc.name}, ${svc.duration_minutes}, ${svc.price}, true)
        RETURNING id, name, duration_minutes, price
      `;
      inserted.push(result.rows[0]);
    }

    return NextResponse.json({ success: true, services: inserted });
  } catch (error) {
    console.error("Error seeding services:", error);
    return NextResponse.json({ error: "خطا در ساخت خدمات پیش‌فرض" }, { status: 500 });
  }
}
