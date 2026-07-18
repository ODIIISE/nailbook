import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyPin } from "@/lib/pin-hash";
import { signCustomerSession } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const { rows: users } = await sql`
      SELECT id, phone, name, role, pin, failed_attempts, locked_until
      FROM users WHERE phone = ${phone}
    `;
    const user = users[0];

    if (!user) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json({ error: "حساب قفل شده است" }, { status: 423 });
    }

    if (!user.pin) {
      return NextResponse.json({ error: "رمزی تنظیم نشده است" }, { status: 400 });
    }

    if (!verifyPin(String(pin).trim(), user.pin)) {
      const attempts = (user.failed_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      await sql`UPDATE users SET failed_attempts = ${attempts}, locked_until = ${lockUntil} WHERE id = ${user.id}`;
      return NextResponse.json({ error: "رمز عبور اشتباه است", attemptsLeft: Math.max(0, 5 - attempts) }, { status: 401 });
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
