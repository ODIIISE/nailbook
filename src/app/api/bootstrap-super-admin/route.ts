import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { createSuperAdmin, signSuperAdminSession } from "@/lib/super-admin-auth";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin, name } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "شماره و رمز الزامی است" }, { status: 400 });
    }

    const cleanPin = String(pin).trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
    }

    // Auto-create tables if they don't exist (first-time setup)
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
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Check how many super-admins exist
    const { rows: existing } = await sql`SELECT COUNT(*) as count FROM super_admins`;
    const count = parseInt(existing[0]?.count || "0");

    if (count > 0) {
      return NextResponse.json(
        { error: "اکانت مدیر از قبل وجود دارد." },
        { status: 403 }
      );
    }

    const userId = await createSuperAdmin(String(phone).trim(), cleanPin, name?.trim());

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set("super_admin_session", signSuperAdminSession(userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Bootstrap super-admin error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
