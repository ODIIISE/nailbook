import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });

    const { rows } = await sql`SELECT id FROM users WHERE phone = ${phone} LIMIT 1`;

    // Always return same structure — never reveal if phone exists or has PIN
    return NextResponse.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error("check-phone error:", error);
    // Return same success response to prevent timing attacks
    return NextResponse.json({ exists: false });
  }
}
