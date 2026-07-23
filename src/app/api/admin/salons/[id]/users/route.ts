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
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let query;
    if (search) {
      query = sql`
        SELECT id, phone, name, role, failed_attempts, locked_until, created_at
        FROM users
        WHERE salon_id = ${id}
        AND (name ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`})
        ORDER BY created_at DESC
        LIMIT 100
      `;
    } else {
      query = sql`
        SELECT id, phone, name, role, failed_attempts, locked_until, created_at
        FROM users
        WHERE salon_id = ${id}
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }

    const { rows } = await query;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
