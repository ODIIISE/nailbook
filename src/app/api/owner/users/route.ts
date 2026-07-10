import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { rows } = await sql`SELECT id, phone, name, role, pin, created_at FROM users ORDER BY created_at DESC`;
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
      VALUES (${userId}, ${phone}, ${pin}, ${name.trim()}, ${role || "customer"})
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

    const body = await request.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });

    // Prevent changing own role
    if (userId === owner.id && body.role && body.role !== "owner") {
      return NextResponse.json({ error: "نقش خود را نمی‌توانید تغییر دهید" }, { status: 400 });
    }

    // Check if user exists
    const { rows: existing } = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // Update each field individually using tagged template literals
    if (body.phone !== undefined) {
      await sql`UPDATE users SET phone = ${body.phone} WHERE id = ${userId}`;
    }
    if (body.name !== undefined) {
      await sql`UPDATE users SET name = ${body.name} WHERE id = ${userId}`;
    }
    if (body.role !== undefined) {
      await sql`UPDATE users SET role = ${body.role} WHERE id = ${userId}`;
    }
    if (body.pin !== undefined && String(body.pin).length === 4) {
      await sql`UPDATE users SET pin = ${String(body.pin)} WHERE id = ${userId}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User update error:", error);
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
