import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

const SECRET = process.env.OWNER_SESSION_SECRET || "nailbook-owner-secret-key-change-in-production";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

function signSession(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const hashedPin = hashPin(pin);

    // Check if account is locked
    const { data: checkUser } = await supabaseAdmin
      .from("users")
      .select("id, locked_until, failed_attempts")
      .eq("phone", phone)
      .eq("role", "owner")
      .single();

    if (checkUser?.locked_until && new Date(checkUser.locked_until) > new Date()) {
      return NextResponse.json({ error: "حساب قفل شده است. لطفاً بعداً تلاش کنید" }, { status: 423 });
    }

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, phone, name, role, pin, failed_attempts")
      .eq("phone", phone)
      .eq("role", "owner")
      .single();

    if (error || !user || user.pin !== hashedPin) {
      // Increment failed attempts
      const attempts = (user?.failed_attempts || 0) + 1;
      const updates: Record<string, unknown> = { failed_attempts: attempts };
      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // Lock 30 min
      }
      if (user?.id) {
        await supabaseAdmin.from("users").update(updates).eq("id", user.id);
      }
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

    // Reset failed attempts on success
    await supabaseAdmin.from("users").update({ failed_attempts: 0, locked_until: null }).eq("id", user.id);

    const response = NextResponse.json({ success: true });

    response.cookies.set("owner_session", signSession(user.id), {
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
