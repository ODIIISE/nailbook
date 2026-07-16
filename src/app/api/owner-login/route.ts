import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyPin } from "@/lib/pin-hash";
import { signOwnerSession } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const { rows: checkUser } = await sql`
      SELECT id, locked_until, failed_attempts FROM users
      WHERE phone = ${phone} AND role = 'owner'
    `;

    if (checkUser[0]?.locked_until && new Date(checkUser[0].locked_until) > new Date()) {
      return NextResponse.json({ error: "حساب قفل شده است. لطفاً بعداً تلاش کنید" }, { status: 423 });
    }

    const { rows: users } = await sql`
      SELECT id, phone, name, role, pin, failed_attempts FROM users
      WHERE phone = ${phone} AND role = 'owner'
    `;
    const user = users[0];

    if (!user || !verifyPin(pin, user.pin)) {
      const attempts = (user?.failed_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      if (user?.id) {
        await sql`UPDATE users SET failed_attempts = ${attempts}, locked_until = ${lockUntil} WHERE id = ${user.id}`;
      }
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

    await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;

    logActivity({
      eventType: "owner_login",
      entityType: "user",
      entityId: user.id,
      description: `مدیر "${user.name || user.phone}" وارد شد`,
      metadata: { phone: user.phone, name: user.name },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("owner_session", signOwnerSession(user.id), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Owner login error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
