import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

export async function GET(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { rows } = await sql`SELECT id, phone, name, created_at FROM super_admins WHERE id = ${admin.id}`;
    if (!rows.length) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    return NextResponse.json({
      id: rows[0].id,
      phone: rows[0].phone,
      name: rows[0].name || "مدیر کل",
    });
  } catch (error) {
    console.error("Super admin me error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
