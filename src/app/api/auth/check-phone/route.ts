import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });

    const { rows } = await sql`SELECT id, pin IS NOT NULL AS has_pin FROM users WHERE phone = ${phone} LIMIT 1`;

    // Return exists + hasPin for booking flow routing
    return NextResponse.json({
      exists: rows.length > 0,
      hasPin: rows.length > 0 ? rows[0].has_pin : false,
    });
  } catch (error) {
    console.error("check-phone error:", error);
    return NextResponse.json({ exists: false, hasPin: false });
  }
}
