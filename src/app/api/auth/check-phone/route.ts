import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

function normalizeDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });

    const normalized = normalizeDigits(String(phone).trim());

    const { rows } = await sql`SELECT id FROM users WHERE phone = ${normalized} LIMIT 1`;

    // Return consistent response — never leak hasPin or role
    return NextResponse.json({
      exists: rows.length > 0,
    });
  } catch (error) {
    console.error("check-phone error:", error);
    return NextResponse.json({ exists: false });
  }
}
