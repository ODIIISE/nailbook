import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

async function verifyOwner(request: NextRequest) {
  const ownerSession = request.cookies.get("owner_session")?.value;
  if (!ownerSession) return null;
  const { data: owner } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", ownerSession)
      .eq("role", "owner")
    .single();
  return owner;
}

// GET - list all users
export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, phone, name, role, failed_attempts, locked_until, created_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "خطا در دریافت اطلاعات" }, { status: 500 });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// POST - add new user
export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { phone, name, pin, role } = await request.json();
    if (!phone || !pin || pin.length !== 4) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Check duplicate
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", phone)
      .single();

    if (existing) {
      return NextResponse.json({ error: "این شماره قبلاً ثبت شده" }, { status: 400 });
    }

    const hashedPin = hashPin(pin);
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .insert({
        phone,
        pin: hashedPin,
        name: name || "",
        role: role || "customer",
        failed_attempts: 0,
      })
      .select("id, phone, name, role, created_at")
      .single();

    if (error) return NextResponse.json({ error: "خطا در ایجاد کاربر" }, { status: 500 });
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// PUT - update user
export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId, phone, name, pin, role, locked } = await request.json();
    if (!userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });

    // If phone is changing, get old phone first to sync bookings
    let oldPhone: string | null = null;
    if (phone) {
      const { data: currentUser } = await supabaseAdmin
        .from("users")
        .select("phone")
        .eq("id", userId)
        .single();
      if (currentUser && currentUser.phone !== phone) {
        oldPhone = currentUser.phone;
      }
    }

    const updates: Record<string, unknown> = {};
    if (phone !== undefined) updates.phone = phone;
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (locked !== undefined) {
      updates.locked_until = locked ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null;
      updates.failed_attempts = 0;
    }
    if (pin && pin.length === 4) {
      updates.pin = hashPin(pin);
      updates.failed_attempts = 0;
      updates.locked_until = null;
    }

    const { error } = await supabaseAdmin
      .from("users")
      .update(updates)
      .eq("id", userId);

    if (error) return NextResponse.json({ error: "خطا در بروزرسانی" }, { status: 500 });

    // Sync bookings if phone changed
    if (oldPhone && phone) {
      await supabaseAdmin
        .from("bookings")
        .update({ customer_phone: phone })
        .eq("customer_phone", oldPhone);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

// DELETE - remove user
export async function DELETE(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });

    // Prevent deleting yourself
    if (userId === owner.id) {
      return NextResponse.json({ error: "نمی‌توانید حساب خود را حذف کنید" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) return NextResponse.json({ error: "خطا در حذف کاربر" }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
