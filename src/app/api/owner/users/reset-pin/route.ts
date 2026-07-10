import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId, pin } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });
    }

    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
    }

    // Hash the new PIN
    const hashedPin = hashPin(String(pin));

    // Update using RETURNING to confirm it worked
    const { rows } = await sql`
      UPDATE users SET pin = ${hashedPin} WHERE id = ${userId} RETURNING id, pin
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // Double-check the pin matches
    if (rows[0].pin !== hashedPin) {
      return NextResponse.json({ error: "خطا در بروزرسانی رمز" }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: rows[0].id });
  } catch (error) {
    console.error("Reset PIN error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
