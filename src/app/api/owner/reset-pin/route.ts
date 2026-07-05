import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const ownerSession = request.cookies.get("owner_session")?.value;
    if (!ownerSession) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    // Verify owner
    const { data: owner } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", ownerSession)
      .in("role", ["owner", "artist"])
      .single();

    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { userId, newPin } = await request.json();

    if (!userId || !newPin || newPin.length !== 4) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Hash and update
    const hashedPin = hashPin(newPin);

    const { error } = await supabaseAdmin
      .from("users")
      .update({
        pin: hashedPin,
        failed_attempts: 0,
        locked_until: null,
      })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "خطا در بروزرسانی" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reset PIN error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
