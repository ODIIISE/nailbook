import { NextRequest, NextResponse } from "next/server";
import { verifySuperAdminPin, signSuperAdminSession } from "@/lib/super-admin-auth";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const userId = await verifySuperAdminPin(String(phone).trim(), String(pin).trim());
    if (!userId) {
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

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
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Super admin login error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
