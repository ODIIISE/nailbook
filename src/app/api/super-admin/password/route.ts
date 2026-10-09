import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import {
  verifySuperAdmin,
  verifyPin,
  setSuperAdminPassword,
  isValidSuperAdminPassword,
} from "@/lib/super-admin-auth";
import { logActivity } from "@/lib/db/activity-log";
import { createRateLimiter, clientIpFrom } from "@/lib/http-security";

// Same brute-force envelope as the super-admin login: the current-password
// check is a guessable oracle without it.
const attemptLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
});

// POST: change the signed-in super-admin's own password.
export async function POST(request: NextRequest) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }
    const adminId = (admin as { id: string }).id;

    const ip = clientIpFrom(request);
    const key = `sa-pw:${adminId}:${ip}`;
    if (!attemptLimiter.check(key).allowed) {
      return NextResponse.json(
        { error: "تعداد تلاش‌ها بیش از حد مجاز. دقایقی دیگر تلاش کنید." },
        { status: 429 }
      );
    }

    const { currentPassword, newPassword } = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
    };
    if (typeof currentPassword !== "string" || !isValidSuperAdminPassword(newPassword)) {
      attemptLimiter.record(key, false);
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }
    const next = (newPassword as string).trim();

    const { rows } = await sql`SELECT id, phone, pin FROM super_admins WHERE id = ${adminId}`;
    const row = rows[0] as { id: string; phone: string; pin: string } | undefined;
    if (!row || !verifyPin(String(currentPassword), row.pin)) {
      attemptLimiter.record(key, false);
      return NextResponse.json({ error: "رمز فعلی اشتباه است" }, { status: 401 });
    }
    if (String(currentPassword).trim() === next) {
      attemptLimiter.record(key, false);
      return NextResponse.json({ error: "رمز جدید با رمز فعلی یکسان است" }, { status: 400 });
    }

    const updatedId = await setSuperAdminPassword(row.phone, next);
    if (!updatedId) {
      attemptLimiter.record(key, false);
      return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
    }
    attemptLimiter.record(key, true);

    void logActivity({
      eventType: "owner_login",
      entityType: "super_admin",
      entityId: adminId,
      description: `مدیر کل رمز عبور را تغییر داد`,
      metadata: { userId: adminId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Super admin password change error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
