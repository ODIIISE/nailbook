import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { rows } = await sql`SELECT id, phone, name, role, created_at FROM users ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { phone, pin, name, role } = await request.json();
    if (!phone || !pin) return NextResponse.json({ error: "داده ناقص" }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });

    const userId = crypto.randomUUID();
    await sql`
      INSERT INTO users (id, phone, pin, name, role)
      VALUES (${userId}, ${phone}, ${hashPin(pin)}, ${name.trim()}, ${role || "customer"})
    `;
    return NextResponse.json({ success: true, userId });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId, phone, name, role, pin } = await request.json();
    if (!userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });

    // Prevent changing own role
    if (userId === owner.id && role && role !== "owner") {
      return NextResponse.json({ error: "نقش خود را نمی‌توانید تغییر دهید" }, { status: 400 });
    }

    // Build dynamic update based on provided fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(phone);
    }
    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name);
    }
    if (role !== undefined) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }
    if (pin !== undefined && String(pin).length === 4) {
      updates.push(`pin = $${idx++}`);
      values.push(hashPin(String(pin)));
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "داده‌ای برای بروزرسانی ارسال نشد" }, { status: 400 });
    }

    values.push(userId);
    await sql.query(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, values);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });

    // Prevent self-deletion
    if (userId === owner.id) {
      return NextResponse.json({ error: "نمی‌توانید حساب خود را حذف کنید" }, { status: 400 });
    }

    // Check if user is an owner
    const { rows: targetUser } = await sql`SELECT role FROM users WHERE id = ${userId}`;
    if (targetUser[0]?.role === "owner") {
      return NextResponse.json({ error: "حذف مدیر مجاز نیست" }, { status: 400 });
    }

    await sql`DELETE FROM users WHERE id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
