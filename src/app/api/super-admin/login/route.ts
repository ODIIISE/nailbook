import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminPin, signSuperAdminSession } from "@/lib/super-admin-auth";
import { logActivity } from "@/lib/db/activity-log";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";

// Rate limiting for PIN brute-force protection. Two keys per attempt:
// per-phone (rotating the spoofable x-forwarded-for cannot reset it) and
// per-IP+phone. Bounded map with sweep — no unbounded memory growth.
import { createRateLimiter, clientIpFrom } from "@/lib/http-security";

const attemptLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
});

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Rate limit per phone AND per IP+phone combination
    const cleanPhone = String(phone).trim();
    const ip = clientIpFrom(request);
    const phoneKey = `p:${cleanPhone}`;
    const comboKey = `i:${ip}:${cleanPhone}`;
    const gate = attemptLimiter.check(phoneKey).allowed ? attemptLimiter.check(comboKey) : attemptLimiter.check(phoneKey);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: `تعداد تلاش‌ها بیش از حد مجاز. ${Math.max(1, Math.ceil((gate.retryAfter || 0) / 60))} دقیقه دیگر تلاش کنید.` },
        { status: 429 }
      );
    }

    const userId = await verifySuperAdminPin(cleanPhone, String(pin).trim());
    if (!userId) {
      attemptLimiter.record(phoneKey, false);
      attemptLimiter.record(comboKey, false);
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

    attemptLimiter.record(phoneKey, true);
    attemptLimiter.record(comboKey, true);

    logActivity({
      eventType: "owner_login",
      entityType: "super_admin",
      entityId: userId,
      description: `مدیر کل وارد شد`,
      metadata: { userId },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("super_admin_session", signSuperAdminSession(userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Super admin login error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
