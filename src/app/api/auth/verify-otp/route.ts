import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { verifyOtp } from "@/lib/otp-service";
import { signCustomerSession } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();

    console.log("[verify-otp] env check:", {
      customerSecretSet: Boolean(process.env.CUSTOMER_SESSION_SECRET),
      nodeEnv: process.env.NODE_ENV,
    });

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

    if (!user) {
      const userId = crypto.randomUUID();
      // ON CONFLICT guards against a rare race where two concurrent verify
      // requests both try to create the same new user.
      const { rows: inserted } = await sql<{ id: string; phone: string; name: string; role: string; roles: string[] }>`
        INSERT INTO users (id, phone, pin, name, role, roles)
        VALUES (${userId}, ${normalized}, '', '', 'customer', ARRAY['customer']::TEXT[])
        ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
        RETURNING id, phone, name, role, roles
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
      metadata: { userId: user.id, phone: user.phone, name: user.name, roles: user.roles },
    });

    let sessionToken: string;
    try {
      sessionToken = signCustomerSession(user.id);
    } catch (err) {
      console.error("[verify-otp] signCustomerSession failed:", err);
      return NextResponse.json({ error: "خطای پیکربندی نشست" }, { status: 500 });
    }

    // Single auth cookie for both customer and owner. Owner dashboard is gated
    // by middleware checking 'owner' in DB roles array.
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: Array.isArray(user.roles) && user.roles.includes("owner") ? "owner" : (user.role ?? "customer"),
        roles: Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : ["customer"],
      },
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

async function getUserByPhone(phone: string): Promise<{ id: string; phone: string; name: string; role: string; roles: string[] } | null> {
  // "role" is a Postgres reserved keyword — must be double-quoted in SELECT.
  const { rows } = await sql<{ id: string; phone: string; name: string; role: string; roles: string[] }>`
    SELECT id, phone, name, "role", roles FROM users WHERE phone = ${phone} LIMIT 1
  `;
  return normalizeUserRoles(rows[0]) || null;
}

function normalizeUserRoles<T extends { roles: string[] | string | null }>(row: T | null): T | null {
  if (!row) return row;
  // Postgres returns TEXT[] as JS arrays, but if the column was added/exists, sometimes as text.
  const raw = row.roles as unknown;
  if (Array.isArray(raw)) return row;
  if (typeof raw === "string") {
    try {
      const parsed = (raw as string).replace(/^\{|\}$/g, "").split(",").map((s) => s.replace(/"/g, "").trim()).filter(Boolean);
      (row as { roles: string[] }).roles = parsed;
    } catch {
      (row as { roles: string[] }).roles = ["customer"];
    }
  }
  if (!row.roles || (Array.isArray(row.roles) && row.roles.length === 0)) {
    (row as { roles: string[] }).roles = ["customer"];
  }
  return row;
}
