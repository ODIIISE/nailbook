import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { storePin, hashPin } from "@/lib/pin-hash";
import crypto from "crypto";
import { logActivity } from "@/lib/db/activity-log";
import { normalizeDigits } from "@/lib/digits";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { rows } = await sql`SELECT id, phone, name, role, failed_attempts, locked_until, created_at FROM users ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { phone, pin, name, role } = await request.json();
    if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });

    const normalized = normalizeDigits(String(phone).trim());

    // Validate PIN is exactly 4 digits if provided
    if (pin !== undefined && pin !== null && pin !== "") {
      if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
        return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
      }
    }

    const validRole = role === "owner" ? "owner" : "customer";
    const userId = crypto.randomUUID();
    // Hash PIN for owners, store plain for customers
    const storedPin = pin ? (validRole === "owner" ? hashPin(String(pin)) : storePin(String(pin))) : null;
    await sql`
      INSERT INTO users (id, phone, pin, name, role)
      VALUES (${userId}, ${normalized}, ${storedPin}, ${name.trim()}, ${validRole})
    `;

    logActivity({
      eventType: "user_registered",
      entityType: "user",
      entityId: userId,
      description: `کاربر جدید ${name.trim()} توسط مدیر اضافه شد`,
      metadata: { phone, name: name.trim(), role: role || "customer" },
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error("Failed to create user:", error);
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

    // Prevent changing other owners' roles (no owner-to-owner demotion)
    if (body.role !== undefined && userId !== owner.id) {
      const { rows: targetRows } = await sql`SELECT role FROM users WHERE id = ${userId}`;
      if (targetRows[0]?.role === "owner" && body.role !== "owner") {
        return NextResponse.json({ error: "تغییر نقش مدیر دیگر مجاز نیست" }, { status: 403 });
      }
    }

    // Check if user exists
    const { rows: existing } = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (existing.length === 0) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // Update each field individually using tagged template literals
    if (body.phone !== undefined) {
      const normalized = normalizeDigits(String(body.phone).trim());
      await sql`UPDATE users SET phone = ${normalized} WHERE id = ${userId}`;
    }
    if (body.name !== undefined) {
      await sql`UPDATE users SET name = ${body.name} WHERE id = ${userId}`;
    }
    if (body.role !== undefined) {
      const validRoles = ["customer", "owner"];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
      }
      await sql`UPDATE users SET role = ${body.role} WHERE id = ${userId}`;
    }
    if (body.pin !== undefined && body.pin !== null && body.pin !== "") {
      if (String(body.pin).length !== 4 || !/^\d{4}$/.test(String(body.pin))) {
        return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
      }
      // Determine target role to decide hashing strategy
      const targetRole = body.role || (await sql`SELECT role FROM users WHERE id = ${userId}`).rows[0]?.role;
      const storedPin = targetRole === "owner" ? hashPin(String(body.pin)) : storePin(String(body.pin));
      await sql`UPDATE users SET pin = ${storedPin}, failed_attempts = 0, locked_until = NULL WHERE id = ${userId}`;
    }

    // Log the update
    const updatedFields = Object.keys(body).filter((k) => k !== "userId" && body[k] !== undefined);
    if (updatedFields.length > 0) {
      logActivity({
        eventType: "user_updated",
        entityType: "user",
        entityId: userId,
        description: `کاربر به‌روزرسانی شد`,
        metadata: { userId, fields: updatedFields },
      });
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

    logActivity({
      eventType: "user_deleted",
      entityType: "user",
      entityId: userId,
      description: `کاربر حذف شد`,
      metadata: { userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
