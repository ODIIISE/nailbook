import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { userId, name } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

    await sql`UPDATE users SET name = ${name || ""} WHERE id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
