import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin, name } = await request.json();

    // Validate inputs
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

    // Check if phone already exists
    const { rows: existing } = await sql`SELECT id, pin FROM users WHERE phone = ${phone}`;
    if (existing.length > 0) {
      // User exists but has no PIN — allow setting PIN (first-time signup)
      if (existing[0].pin) {
        return NextResponse.json({ error: "این شماره قبلاً ثبت شده" }, { status: 409 });
      }
      // Set PIN for existing user without one
      await sql`UPDATE users SET pin = ${cleanPin}, name = ${trimmedName} WHERE id = ${existing[0].id}`;

      const response = NextResponse.json({
        success: true,
        user: { id: existing[0].id, phone, name: trimmedName, role: "customer" },
      });
      response.cookies.set("session", existing[0].id, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return response;
    }

    // Create new user
    const userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, phone, pin, name, role)
      VALUES (${userId}, ${phone}, ${cleanPin}, ${trimmedName}, 'customer')
    `;

    const response = NextResponse.json({
      success: true,
      user: { id: userId, phone, name: trimmedName, role: "customer" },
    });
    response.cookies.set("session", userId, {
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
