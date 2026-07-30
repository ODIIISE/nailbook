import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { verifyOtp } from "@/lib/otp-service";
import { signCustomerSession } from "@/lib/customer-auth";
import { signOwnerSession } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";

export async function POST(request: NextRequest) {
  try {
    const { phone, code, roleContext = "customer" } = await request.json();

    // Help diagnose production configuration without exposing secrets.
    console.log("[verify-otp] env check:", {
      customerSecretSet: Boolean(process.env.CUSTOMER_SESSION_SECRET),
      ownerSecretSet: Boolean(process.env.OWNER_SESSION_SECRET),
      nodeEnv: process.env.NODE_ENV,
    });

    if (!phone || !code) {
      return NextResponse.json({ error: "شماره و کد الزامی است" }, { status: 400 });
    }

    const normalized = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalized)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    // For owner logins, verify the number is actually an owner before consuming the OTP.
    let user: { id: string; phone: string; name: string; role: string } | null = null;
    if (roleContext === "owner") {
      user = await getUserByPhone(normalized);
      if (!user || user.role !== "owner") {
        return NextResponse.json({ error: "شماره یا کد نامعتبر است" }, { status: 401 });
      }
    }

    const otpResult = await verifyOtp(normalized, String(code).trim());
    if (!otpResult.valid) {
      return NextResponse.json({ error: otpResult.error || "کد نامعتبر است" }, { status: otpResult.locked ? 423 : 401 });
    }

    if (!user) {
      user = await getUserByPhone(normalized);
    }

    if (roleContext === "owner") {
      if (!user) {
        return NextResponse.json({ error: "شماره یا کد نامعتبر است" }, { status: 401 });
      }
      await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;

      void logActivity({
        eventType: "owner_login",
        entityType: "user",
        entityId: user.id,
        description: `مدیر "${user.name || user.phone}" وارد شد`,
        metadata: { userId: user.id, phone: user.phone, name: user.name },
      });

      let ownerSessionToken: string;
      try {
        ownerSessionToken = signOwnerSession(user.id);
      } catch (err) {
        console.error("[verify-otp] signOwnerSession failed:", err);
        return NextResponse.json({ error: "خطای پیکربندی نشست" }, { status: 500 });
      }

      const response = NextResponse.json({
        success: true,
        user: { id: user.id, phone: user.phone, name: user.name, role: "owner" },
      });
      response.cookies.set("owner_session", ownerSessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: "/",
      });
      return response;
    }

    // Customer flow
    if (!user) {
      const userId = crypto.randomUUID();
      // ON CONFLICT guards against a rare race where two concurrent verify
      // requests both try to create the same new user.
      const { rows: inserted } = await sql<{ id: string; phone: string; name: string; role: string }>`
        INSERT INTO users (id, phone, name, role)
        VALUES (${userId}, ${normalized}, '', 'customer')
        ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
        RETURNING id, phone, name, role
      `;
      user = inserted[0];

      void logActivity({
        eventType: "user_registered",
        entityType: "user",
        entityId: user.id,
        description: `کاربر جدید ${normalized} ثبت‌نام کرد`,
        metadata: { phone: normalized },
      });
    } else {
      await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;
    }

    void logActivity({
      eventType: "user_login",
      entityType: "user",
      entityId: user.id,
      description: `کاربر "${user.name || user.phone}" وارد شد`,
      metadata: { userId: user.id, phone: user.phone, name: user.name },
    });

    let sessionToken: string;
    try {
      sessionToken = signCustomerSession(user.id);
    } catch (err) {
      console.error("[verify-otp] signCustomerSession failed:", err);
      return NextResponse.json({ error: "خطای پیکربندی نشست" }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
    });
    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

async function getUserByPhone(phone: string): Promise<{ id: string; phone: string; name: string; role: string } | null> {
  const { rows } = await sql<{ id: string; phone: string; name: string; role: string }>`SELECT id, phone, name, role FROM users WHERE phone = ${phone} LIMIT 1`;
  return rows[0] || null;
}
