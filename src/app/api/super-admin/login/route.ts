import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminPin, signSuperAdminSession } from "@/lib/super-admin-auth";
import { logActivity } from "@/lib/db/activity-log";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";

// Simple in-memory rate limiter for PIN brute-force protection.
// Resets on cold starts (serverless) — sufficient for Vercel edge cases.
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (entry) {
    // Check if currently blocked
    if (entry.blockedUntil > now) {
      return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
    }
    // Reset if block expired
    if (entry.blockedUntil > 0 && entry.blockedUntil <= now) {
      loginAttempts.delete(key);
      return { allowed: true };
    }
  }
  return { allowed: true };
}

function recordAttempt(key: string, success: boolean) {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (success) {
    loginAttempts.delete(key);
    return;
  }

  if (!entry || entry.blockedUntil <= now) {
    const count = ((!entry || entry.blockedUntil <= now) ? 0 : entry.count) + 1;
    if (count >= MAX_ATTEMPTS) {
      loginAttempts.set(key, { count: 0, blockedUntil: now + BLOCK_DURATION_MS });
    } else {
      loginAttempts.set(key, { count, blockedUntil: 0 });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Rate limit by IP + phone combination
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateKey = `${ip}:${String(phone).trim()}`;
    const rateCheck = checkRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `تعداد تلاش‌ها بیش از حد مجاز. ${Math.ceil(rateCheck.retryAfter! / 60)} دقیقه دیگر تلاش کنید.` },
        { status: 429 }
      );
    }

    const userId = await verifySuperAdminPin(String(phone).trim(), String(pin).trim());
    if (!userId) {
      recordAttempt(rateKey, false);
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

    recordAttempt(rateKey, true);

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
