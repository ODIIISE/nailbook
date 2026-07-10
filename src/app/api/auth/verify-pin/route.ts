import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";

function signSession(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const secret = process.env.OWNER_SESSION_SECRET || "nailbook-owner-secret-key-change-in-production";
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();
    if (!phone || !pin) return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });

    const { rows: users } = await sql`
      SELECT id, pin, failed_attempts, locked_until FROM users WHERE phone = ${phone}
    `;
    const user = users[0];

    if (user?.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json({ error: "حساب قفل شده است" }, { status: 423 });
    }

    if (!user || user.pin !== pin) {
      const attempts = (user?.failed_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      if (user?.id) {
        await sql`UPDATE users SET failed_attempts = ${attempts}, locked_until = ${lockUntil} WHERE id = ${user.id}`;
      }
      return NextResponse.json({ error: "رمز عبور اشتباه است" }, { status: 401 });
    }

    await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (${sessionId}, ${user.id}, ${signSession(user.id)}, ${expiresAt})
    `;

    const response = NextResponse.json({ success: true, userId: user.id });
    response.cookies.set("session", signSession(user.id), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
