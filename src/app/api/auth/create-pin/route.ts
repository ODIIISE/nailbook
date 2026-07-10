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
    const { phone, pin, name } = await request.json();
    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }

    // Check if phone already exists
    const { rows: existing } = await sql`SELECT id FROM users WHERE phone = ${phone}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: "این شماره قبلاً ثبت شده" }, { status: 409 });
    }

    const userId = crypto.randomUUID();

    await sql`
      INSERT INTO users (id, phone, pin, name, role)
      VALUES (${userId}, ${phone}, ${pin}, ${name.trim()}, 'customer')
    `;

    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await sql`
      INSERT INTO sessions (id, user_id, token, expires_at)
      VALUES (${sessionId}, ${userId}, ${signSession(userId)}, ${expiresAt})
    `;

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set("session", signSession(userId), {
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
