import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { getSalonId } from "@/lib/multi-tenant";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
    }

    const normalized = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalized)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const salonId = getSalonId();
    const result = salonId
      ? await sql.query("SELECT id FROM users WHERE phone = $1 AND salon_id = $2 LIMIT 1", [normalized, salonId])
      : await sql`SELECT id FROM users WHERE phone = ${normalized} LIMIT 1`;
    const { rows } = result;
    return NextResponse.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error("Owner user check error:", error);
    return NextResponse.json({ exists: false }, { status: 500 });
  }
}
