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

    // Check if user exists
    const { rows: existing } = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // Hash the new PIN
    const hashedPin = hashPin(String(pin));

    // Update the PIN
    await sql`UPDATE users SET pin = ${hashedPin} WHERE id = ${userId}`;

    // Verify the update succeeded
    const { rows: verify } = await sql`SELECT pin FROM users WHERE id = ${userId}`;
    if (!verify[0] || verify[0].pin !== hashedPin) {
      console.error("PIN verification failed after update:", { userId, expected: hashedPin, actual: verify[0]?.pin });
      return NextResponse.json({ error: "خطا در بروزرسانی رمز" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset PIN error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
