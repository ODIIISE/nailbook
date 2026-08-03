import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

import crypto from "crypto";
import { logActivity } from "@/lib/db/activity-log";
import { normalizeDigits } from "@/lib/digits";
import { getSalonId } from "@/lib/multi-tenant";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const salonId = getSalonId();
    const result = salonId
      ? await sql.query("SELECT id, phone, name, role, locked_until, created_at FROM users WHERE salon_id = $1 ORDER BY created_at DESC", [salonId])
      : await sql`SELECT id, phone, name, role, locked_until, created_at FROM users ORDER BY created_at DESC`;
    const rows = result.rows;
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

    const { phone, name, role } = await request.json();
    if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
    if (!name || !name.trim()) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });

    const normalized = normalizeDigits(String(phone).trim());

    const salonId = getSalonId();
    const userId = crypto.randomUUID();
    if (salonId) {
      await sql.query(
        "INSERT INTO users (id, phone, name, role, salon_id) VALUES ($1, $2, $3, $4, $5)",
        [userId, normalized, name.trim(), role === "owner" ? "owner" : "customer", salonId]
      );
    } else {
      await sql`
        INSERT INTO users (id, phone, name, role)
        VALUES (${userId}, ${normalized}, ${name.trim()}, ${role === "owner" ? "owner" : "customer"})
      `;
    }

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
      const salonId = getSalonId();
      const targetResult = salonId
        ? await sql.query("SELECT role FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId])
        : await sql`SELECT role FROM users WHERE id = ${userId}`;
      const targetRows = targetResult.rows;
      if (targetRows[0]?.role === "owner" && body.role !== "owner") {
        return NextResponse.json({ error: "تغییر نقش مدیر دیگر مجاز نیست" }, { status: 403 });
      }
    }

    // Check if user exists
    const salonId = getSalonId();
    const existingResult = salonId
      ? await sql.query("SELECT id FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId])
      : await sql`SELECT id FROM users WHERE id = ${userId}`;
    const existing = existingResult.rows;
    if (existing.length === 0) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    // Update each field individually using tagged template literals
    if (body.phone !== undefined) {
      const normalized = normalizeDigits(String(body.phone).trim());
      if (salonId) {
        await sql.query("UPDATE users SET phone = $1 WHERE id = $2 AND salon_id = $3", [normalized, userId, salonId]);
      } else {
        await sql`UPDATE users SET phone = ${normalized} WHERE id = ${userId}`;
      }
    }
    if (body.name !== undefined) {
      if (salonId) {
        await sql.query("UPDATE users SET name = $1 WHERE id = $2 AND salon_id = $3", [body.name, userId, salonId]);
      } else {
        await sql`UPDATE users SET name = ${body.name} WHERE id = ${userId}`;
      }
    }
    if (body.role !== undefined) {
      const validRoles = ["customer", "owner"];
      if (!validRoles.includes(body.role)) {
        return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
      }
      if (salonId) {
        await sql.query("UPDATE users SET role = $1 WHERE id = $2 AND salon_id = $3", [body.role, userId, salonId]);
      } else {
        await sql`UPDATE users SET role = ${body.role} WHERE id = ${userId}`;
      }
    }
    if (typeof body.locked === "boolean") {
      if (body.locked) {
        const lockedUntil = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
        if (salonId) {
          await sql.query("UPDATE users SET locked_until = $1 WHERE id = $2 AND salon_id = $3", [lockedUntil, userId, salonId]);
        } else {
          await sql`UPDATE users SET locked_until = ${lockedUntil} WHERE id = ${userId}`;
        }
      } else {
        if (salonId) {
          await sql.query("UPDATE users SET locked_until = NULL WHERE id = $1 AND salon_id = $2", [userId, salonId]);
        } else {
          await sql`UPDATE users SET locked_until = NULL WHERE id = ${userId}`;
        }
      }
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
    const salonId = getSalonId();
    const targetResult = salonId
      ? await sql.query("SELECT role FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId])
      : await sql`SELECT role FROM users WHERE id = ${userId}`;
    const targetUser = targetResult.rows;

    if (targetUser[0]?.role === "owner") {
      return NextResponse.json({ error: "حذف مدیر مجاز نیست" }, { status: 400 });
    }

    if (salonId) {
      await sql.query("DELETE FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId]);
    } else {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    }

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
