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
    const body = await request.json();
    const { phone, code, roleContext } = body ?? {};

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

    type OtpUser = { id: string; phone: string; name: string; role: string; roles: string[] };
    let user: OtpUser | null = await getUserByPhone(normalized);

    // Owner-flow gate: refuse to auto-create a row when /owner/login is
    // the source. The pre-OTP table check in send-otp already rejected
    // non-owners, but we double-down here in case the OTP was already
    // issued (e.g. before this hardening shipped, or a developer hot-patch).
    if (roleContext === "owner") {
      if (!user) {
        return NextResponse.json({ error: "شماره ثبت نشده" }, { status: 401 });
      }
      const hasOwner =
        (Array.isArray(user.roles) && user.roles.includes("owner")) ||
        user.role === "owner";
      if (!hasOwner) {
        void logActivity({
          eventType: "owner_login_denied",
          entityType: "user",
          entityId: user.id,
          description: `تلاش ورود مدیر توسط ${user.name || user.phone} رد شد`,
          metadata: { phone: normalized, reason: "verify_otp_role_mismatch" },
        });
        return NextResponse.json(
          { error: "این شماره دسترسی مدیر ندارد" },
          { status: 403 }
        );
      }
      // Successful owner login.
      await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;
    } else {
      // Customer flow: auto-create the row if missing, then normal login.
      if (!user) {
        const userId = crypto.randomUUID();
        // ON CONFLICT guards against a rare race where two concurrent verify
        // requests both try to create the same new user.
        const { rows: inserted } = await sql<{ id: string; phone: string; name: string; role: string; roles: string[] }>`
          INSERT INTO users (id, phone, pin, name, "role", roles)
          VALUES (${userId}, ${normalized}, '', '', 'customer', ARRAY['customer']::TEXT[])
          ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
          RETURNING id, phone, name, "role", roles
        `;
        const created = inserted[0];
        if (!created) {
          return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
        }
        user = created;
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
    }

    // After either branch, `user` is non-null. The type is narrowed by
    // asserting it; this is unreachable in practice but tsc can't prove it.
    const signedInUser = user!;
    void logActivity({
      eventType: "user_login",
      entityType: "user",
      entityId: signedInUser.id,
      description: `کاربر "${signedInUser.name || signedInUser.phone}" وارد شد`,
      metadata: { userId: signedInUser.id, phone: signedInUser.phone, name: signedInUser.name, roles: signedInUser.roles },
    });

    let sessionToken: string;
    try {
      sessionToken = signCustomerSession(signedInUser.id);
    } catch (err) {
      console.error("[verify-otp] signCustomerSession failed:", err);
      return NextResponse.json({ error: "خطای پیکربندی نشست" }, { status: 500 });
    }

    // Single auth cookie for both customer and owner. Owner dashboard is gated
    // by middleware checking 'owner' in DB roles array.
    const response = NextResponse.json({
      success: true,
      user: {
        id: signedInUser.id,
        phone: signedInUser.phone,
        name: signedInUser.name,
        role: Array.isArray(signedInUser.roles) && signedInUser.roles.includes("owner") ? "owner" : (signedInUser.role ?? "customer"),
        roles: Array.isArray(signedInUser.roles) && signedInUser.roles.length > 0 ? signedInUser.roles : ["customer"],
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
