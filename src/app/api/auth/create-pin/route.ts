import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { storePin } from "@/lib/pin-hash";
import { signCustomerSession } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";

function normalizeDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export async function POST(request: NextRequest) {
  try {
    const { phone, pin, name } = await request.json();

    if (!phone || !pin || !name) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const normalized = normalizeDigits(String(phone).trim());
    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }

    const cleanPin = String(pin).trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
    }

    // Reject common weak PINs
    const weakPins = ["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "1212", "1010"];
    if (weakPins.includes(cleanPin)) {
      return NextResponse.json({ error: "رمز انتخابی بسیار ساده است" }, { status: 400 });
    }

    const storedPin = storePin(cleanPin);

    const { rows: existing } = await sql`SELECT id, pin FROM users WHERE phone = ${normalized}`;
    if (existing.length > 0) {
      if (existing[0].pin) {
        return NextResponse.json({ error: "این شماره قبلاً ثبت شده" }, { status: 409 });
      }
      await sql`UPDATE users SET pin = ${storedPin}, name = ${trimmedName} WHERE id = ${existing[0].id}`;

      const response = NextResponse.json({
        success: true,
        user: { id: existing[0].id, phone: normalized, name: trimmedName, role: "customer" },
      });
      response.cookies.set("session", signCustomerSession(existing[0].id), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return response;
    }

    const userId = crypto.randomUUID();
    try {
      await sql`
        INSERT INTO users (id, phone, pin, name, role)
        VALUES (${userId}, ${normalized}, ${storedPin}, ${trimmedName}, 'customer')
      `;
    } catch (e: any) {
      // Handle race condition: another signup completed between our SELECT and INSERT
      if (e?.code === "23505") {
        return NextResponse.json({ error: "این شماره قبلاً ثبت شده" }, { status: 409 });
      }
      throw e;
    }

    // Log new user registration
    logActivity({
      eventType: "user_registered",
      entityType: "user",
      entityId: userId,
      description: `کاربر جدید ${trimmedName} ثبت‌نام کرد`,
      metadata: { phone: normalized, name: trimmedName },
    });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, phone: normalized, name: trimmedName, role: "customer" },
    });
    response.cookies.set("session", signCustomerSession(userId), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("create-pin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
