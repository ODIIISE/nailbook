import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { verifyOtp } from "@/lib/otp-service";
import { signCustomerSession } from "@/lib/customer-auth";
import { signOwnerSession } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";

export async function POST(request: NextRequest) {
  try {
    const { phone, code, roleContext = "customer" } = await request.json();

    if (!phone || !code) {
      return NextResponse.json({ error: "شماره و کد الزامی است" }, { status: 400 });
    }

    const normalized = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalized)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const otpResult = await verifyOtp(normalized, String(code).trim());
    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.error || "کد نامعتبر است" }, { status: otpResult.locked ? 423 : 401 });
    }

    let user = await getUserByPhone(normalized);

    if (roleContext === "owner") {
      if (!user || user.role !== "owner") {
        return NextResponse.json({ error: "شماره یا کد نامعتبر است" }, { status: 401 });
      }

      await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;

      await logActivity({
        eventType: "owner_login",
        entityType: "user",
        entityId: user.id,
        description: `مدیر "${user.name || user.phone}" وارد شد`,
        metadata: { userId: user.id, phone: user.phone, name: user.name },
      });

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, phone: user.phone, name: user.name, role: "owner" },
      });
      response.cookies.set("owner_session", signOwnerSession(user.id), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
      return response;
    }

    // Customer flow
    if (!user) {
      const userId = crypto.randomUUID();
      await sql`
        INSERT INTO users (id, phone, name, role)
        VALUES (${userId}, ${normalized}, '', 'customer')
      `;
      user = { id: userId, phone: normalized, name: "", role: "customer" };

      await logActivity({
        eventType: "user_registered",
        entityType: "user",
        entityId: userId,
        description: `کاربر جدید ${normalized} ثبت‌نام کرد`,
        metadata: { phone: normalized },
      });
    } else {
      await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;
    }

    await logActivity({
      eventType: "user_login",
      entityType: "user",
      entityId: user.id,
      description: `کاربر "${user.name || user.phone}" وارد شد`,
      metadata: { userId: user.id, phone: user.phone, name: user.name },
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
    });
    response.cookies.set("session", signCustomerSession(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

async function getUserByPhone(phone: string) {
  const { rows } = await sql`SELECT id, phone, name, role FROM users WHERE phone = ${phone} LIMIT 1`;
  return rows[0] || null;
}
