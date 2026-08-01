import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

import crypto from "crypto";
import { logActivity } from "@/lib/db/activity-log";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";

async function hasRolesColumn(): Promise<boolean> {
  const { rows } = await sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

function normalizeRoles(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((role): role is string => typeof role === "string");
  if (typeof value !== "string") return [];
  return value
    .replace(/^\{|\}$/g, "")
    .split(",")
    .map((role) => role.replace(/"/g, "").trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const rolesColumn = await hasRolesColumn();
    const { rows } = rolesColumn
      ? await sql`SELECT id, phone, name, "role", roles, locked_until, created_at FROM users ORDER BY created_at DESC`
      : await sql`SELECT id, phone, name, "role", locked_until, created_at FROM users ORDER BY created_at DESC`;
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
    if (typeof name !== "string" || !name.trim()) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });

    const normalized = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalized)) return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });

    const validRole = role === "owner" ? "owner" : "customer";
    const userId = crypto.randomUUID();
    const rolesColumn = await hasRolesColumn();
    // Keep legacy `"role"` and the new `roles` TEXT[] array in sync so
    // owner-auth.ts's getUserRoles doesn't have to fall back to legacy
    // synthesis. The literal is cast to TEXT[] so PG accepts the string
    // placeholder value.
    const rolesLiteral = validRole === "owner" ? "{customer,owner}" : "{customer}";
    if (rolesColumn) {
      await sql`
        INSERT INTO users (id, phone, pin, name, "role", roles)
        VALUES (${userId}, ${normalized}, '', ${name.trim()}, ${validRole}, ${rolesLiteral}::TEXT[])
      `;
    } else {
      await sql`
        INSERT INTO users (id, phone, pin, name, "role")
        VALUES (${userId}, ${normalized}, '', ${name.trim()}, ${validRole})
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
        const targetRows = (await (await hasRolesColumn()
        ? sql`SELECT "role", roles FROM users WHERE id = ${userId}`
        : sql`SELECT "role" FROM users WHERE id = ${userId}`)).rows;
      const targetRoles = normalizeRoles(targetRows[0]?.roles);
      const targetIsOwner = targetRows[0]?.role === "owner" || targetRoles.includes("owner");
      if (targetIsOwner && body.role !== "owner") {
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
      const rolesLiteral = body.role === "owner" ? "{customer,owner}" : "{customer}";
      if (await hasRolesColumn()) {
        await sql`UPDATE users SET "role" = ${body.role}, roles = ${rolesLiteral}::TEXT[] WHERE id = ${userId}`;
      } else {
        await sql`UPDATE users SET "role" = ${body.role} WHERE id = ${userId}`;
      }
    }
    if (typeof body.locked === "boolean") {
      if (body.locked) {
        await sql`UPDATE users SET locked_until = ${new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()} WHERE id = ${userId}`;
      } else {
        await sql`UPDATE users SET locked_until = NULL WHERE id = ${userId}`;
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
    const targetUser = (await (await hasRolesColumn()
      ? sql`SELECT "role", roles FROM users WHERE id = ${userId}`
      : sql`SELECT "role" FROM users WHERE id = ${userId}`)).rows;
    const targetRoles = normalizeRoles(targetUser[0]?.roles);
    const targetIsOwner = targetUser[0]?.role === "owner" || targetRoles.includes("owner");
    if (targetIsOwner) {
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
