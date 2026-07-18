import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { storePin } from "@/lib/pin-hash";
import { signCustomerSession } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin, name } = await request.json();

    if (!phone || !pin || !name) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const trimmedName = String(name).trim();
    if (!trimmedName) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }

    const cleanPin = String(pin).trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
    }

    const storedPin = storePin(cleanPin);

    const { rows: existing } = await sql`SELECT id, pin FROM users WHERE phone = ${phone}`;
    if (existing.length > 0) {
      if (existing[0].pin) {
        return NextResponse.json({ error: "این شماره قبلاً ثبت شده" }, { status: 409 });
      }
      await sql`UPDATE users SET pin = ${storedPin}, name = ${trimmedName} WHERE id = ${existing[0].id}`;

      const response = NextResponse.json({
        success: true,
        user: { id: existing[0].id, phone, name: trimmedName, role: "customer" },
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
    await sql`
      INSERT INTO users (id, phone, pin, name, role)
      VALUES (${userId}, ${phone}, ${storedPin}, ${trimmedName}, 'customer')
    `;

    // Log new user registration
    logActivity({
      eventType: "user_registered",
      entityType: "user",
      entityId: userId,
      description: `کاربر جدید ${trimmedName} ثبت‌نام کرد`,
      metadata: { phone, name: trimmedName },
    });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, phone, name: trimmedName, role: "customer" },
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
