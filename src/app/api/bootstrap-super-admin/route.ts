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

    // Check if super_admins table exists
    const { rows: tableCheck } = await sql`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'super_admins') as exists
    `;
    if (!tableCheck[0].exists) {
      return NextResponse.json({ error: "جدول super_admins وجود ندارد. ابتدا مایگریشن را اجرا کنید." }, { status: 500 });
    }

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
