import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });

    const { rows } = await sql`SELECT id, name, role, pin FROM users WHERE phone = ${phone}`;
    if (rows.length === 0) return NextResponse.json({ exists: false });
    return NextResponse.json({ exists: true, hasPin: !!rows[0].pin, role: rows[0].role });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
