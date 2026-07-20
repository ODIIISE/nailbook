import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyPin } from "@/lib/pin-hash";
import { signCustomerSession } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";

function normalizeDigits(str: string): string {
  return str.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

// Simple IP-based rate limiting (in-memory, per-process)
const ipAttempts = new Map<string, { count: number; resetAt: number }>();
const IP_LIMIT = 20;
const IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipAttempts.get(ip);
  if (!record || now > record.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  if (record.count >= IP_LIMIT) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // IP-based rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    if (!checkIpRateLimit(ip)) {
      return NextResponse.json({ error: "تعداد تلاش‌ها بیش از حد مجاز است" }, { status: 429 });
    }

    const normalized = normalizeDigits(String(phone).trim());

    const { rows: users } = await sql`
      SELECT id, phone, name, pin, failed_attempts, locked_until
      FROM users WHERE phone = ${normalized}
    `;
    const user = users[0];

    // Return same error for user-not-found and wrong-PIN — prevents enumeration
    if (!user || !user.pin) {
      return NextResponse.json({ error: "شماره یا رمز اشتباه است" }, { status: 401 });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json({ error: "حساب قفل شده است" }, { status: 423 });
    }

    if (!verifyPin(String(pin).trim(), user.pin)) {
      const attempts = (user.failed_attempts || 0) + 1;
      // Exponential backoff: 5 min, 15 min, 30 min, 60 min, 120 min
      const lockDurations = [0, 0, 0, 0, 5, 15, 30, 60, 120];
      const lockMinutes = lockDurations[Math.min(attempts, lockDurations.length - 1)];
      const lockUntil = lockMinutes > 0 ? new Date(Date.now() + lockMinutes * 60 * 1000).toISOString() : null;
      await sql`UPDATE users SET failed_attempts = ${attempts}, locked_until = ${lockUntil} WHERE id = ${user.id}`;
      // Never disclose attempts remaining
      return NextResponse.json({ error: "شماره یا رمز اشتباه است" }, { status: 401 });
    }

    await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;

    logActivity({
      eventType: "user_login",
      entityType: "user",
      entityId: user.id,
      description: `کاربر "${user.name || user.phone}" وارد شد`,
      metadata: { userId: user.id, phone: user.phone, name: user.name },
    });

    const response = NextResponse.json({
      success: true,
      // Server determines role — never trust client
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
    });
    response.cookies.set("session", signCustomerSession(user.id), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("verify-pin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
