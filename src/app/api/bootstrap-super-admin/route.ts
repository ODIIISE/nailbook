import { NextRequest, NextResponse } from "next/server";
import { sql, type VercelPoolClient } from "@vercel/postgres";
import { signSuperAdminSession, hashPin } from "@/lib/super-admin-auth";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";

function isConfiguredSecretValid(request: NextRequest): boolean {
  const configured = process.env.BOOTSTRAP_SUPER_ADMIN_SECRET?.trim();
  const supplied = request.headers.get("x-setup-secret") || "";

  // Local development may intentionally bootstrap without a secret. Every
  // deployed environment must have an operator-provided secret.
  if (!configured) return process.env.NODE_ENV === "development";
  return supplied === configured;
}

export async function POST(request: NextRequest) {
  let client: VercelPoolClient | null = null;
  try {
    const body = await request.json() as Record<string, unknown>;
    const { phone, pin, name } = body;

    if (!phone || !pin) {
      return NextResponse.json({ error: "شماره و رمز الزامی است" }, { status: 400 });
    }

    if (!isConfiguredSecretValid(request)) {
      return NextResponse.json({ error: "راه‌اندازی اولیه نیاز به کلید محرمانه دارد" }, { status: 403 });
    }

    const normalizedPhone = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalizedPhone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const cleanPin = String(pin).trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
    }
    const cleanName = typeof name === "string" ? name.trim().slice(0, 100) || null : null;

    // Create the setup tables only after the request proves it knows the
    // deployment secret. This prevents an unauthenticated caller from using
    // the bootstrap endpoint as a schema-provisioning primitive.
    await sql`
      CREATE TABLE IF NOT EXISTS super_admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone TEXT UNIQUE NOT NULL,
        pin TEXT NOT NULL,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS salons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        phone TEXT,
        address TEXT,
        description TEXT DEFAULT '',
        slogan TEXT DEFAULT '',
        hero_image_url TEXT,
        logo_url TEXT,
        working_hours JSONB DEFAULT '{}',
        working_hours_text TEXT DEFAULT '',
        specific_days_off JSONB DEFAULT '[]',
        slot_buffer_minutes INTEGER DEFAULT 0,
        slot_interval_minutes INTEGER DEFAULT 15,
        early_extra_hours INTEGER DEFAULT 0,
        late_extra_hours INTEGER DEFAULT 0,
        expand_threshold INTEGER DEFAULT 80,
        proximity_window_hours INTEGER DEFAULT 2,
        allow_overflow BOOLEAN DEFAULT false,
        overflow_minutes INTEGER DEFAULT 0,
        optimization_mode TEXT DEFAULT 'hybrid',
        suggestion_limit INTEGER DEFAULT 3,
        min_useful_gap_minutes INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    client = await sql.connect();
    await client.query("BEGIN");
    // Make the empty-check and first insert one serialized critical section.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", ["nailbook-bootstrap-super-admin"]);

    const { rows: existing } = await client.query("SELECT COUNT(*)::int AS count FROM super_admins");
    if (Number(existing[0]?.count || 0) > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "اکانت مدیر از قبل وجود دارد." },
        { status: 403 }
      );
    }

    const { rows: created } = await client.query(
      "INSERT INTO super_admins (phone, pin, name) VALUES ($1, $2, $3) RETURNING id",
      [normalizedPhone, hashPin(cleanPin), cleanName]
    );
    const userId = created[0]?.id as string | undefined;
    if (!userId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "خطای ایجاد اکانت مدیر" }, { status: 500 });
    }
    await client.query("COMMIT");

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set("super_admin_session", signSuperAdminSession(userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { /* ignore rollback failure */ }
    }
    console.error("Bootstrap super-admin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    client?.release();
  }
}
