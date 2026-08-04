import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql, type VercelPoolClient } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { isValidIranianPhone, normalizeDigits } from "@/lib/digits";
import { resolveSalonId } from "@/lib/multi-tenant";

const VALID_ROLES = new Set(["customer", "owner"]);

type UserRole = "customer" | "owner";

function isOwnerRole(row: { role?: unknown; roles?: unknown }): boolean {
  if (row.role === "owner") return true;
  if (Array.isArray(row.roles)) return row.roles.includes("owner");
  if (typeof row.roles === "string") return /\bowner\b/.test(row.roles);
  return false;
}

async function hasRolesColumn(client: VercelPoolClient): Promise<boolean> {
  const { rows } = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
     ) AS has_roles`
  );
  return Boolean(rows[0]?.has_roles);
}

function duplicateUserResponse(error: unknown) {
  const code = error && typeof error === "object" && "code" in error
    ? (error as { code?: string }).code
    : undefined;
  if (code === "23505") {
    return NextResponse.json({ error: "این شماره قبلاً برای کاربر دیگری ثبت شده است" }, { status: 409 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const salonId = await resolveSalonId();
    const hasRolesResult = await sql.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
       ) AS has_roles`
    );
    const hasRoles = Boolean(hasRolesResult.rows[0]?.has_roles);
    const result = salonId
      ? await sql.query(
          `SELECT id, phone, name, "role"${hasRoles ? ", roles" : ""}, locked_until, created_at
           FROM users WHERE salon_id = $1 ORDER BY created_at DESC`,
          [salonId]
        )
      : await sql.query(
          `SELECT id, phone, name, "role"${hasRoles ? ", roles" : ""}, locked_until, created_at
           FROM users ORDER BY created_at DESC`
        );
    return NextResponse.json(result.rows.map((row) => ({
      ...row,
      role: isOwnerRole(row) ? "owner" : "customer",
    })));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

/** Create a customer or owner from the authenticated owner's tenant. */
export async function POST(request: NextRequest) {
  let client: VercelPoolClient | null = null;
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const body = await request.json() as { phone?: unknown; name?: unknown; role?: unknown };
    const normalized = typeof body.phone === "string" ? normalizeDigits(body.phone.trim()) : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const role: UserRole = body.role === "owner" ? "owner" : "customer";

    if (!isValidIranianPhone(normalized)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    if (
      (body.role !== undefined && typeof body.role !== "string")
      || (typeof body.role === "string" && !VALID_ROLES.has(body.role))
    ) {
      return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
    }

    const salonId = await resolveSalonId();
    client = await sql.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [
      `nailbook-owner-users:${salonId || "global"}`,
    ]);

    const hasRoles = await hasRolesColumn(client);
    const roleColumns = hasRoles ? ', roles' : '';
    const existingResult = salonId
      ? await client.query(
          `SELECT id, phone, name, "role"${roleColumns}, salon_id
           FROM users WHERE phone = $1 AND salon_id = $2 LIMIT 1`,
          [normalized, salonId]
        )
      : await client.query(
          `SELECT id, phone, name, "role"${roleColumns}, salon_id
           FROM users WHERE phone = $1 AND salon_id IS NULL LIMIT 1`,
          [normalized]
        );

    // A legacy global user can be attached to this salon instead of causing a
    // duplicate-phone failure when tenant uniqueness migration is incomplete.
    const existing = existingResult.rows[0] ?? (salonId
      ? (await client.query(
          `SELECT id, phone, name, "role"${roleColumns}, salon_id
           FROM users WHERE phone = $1 AND salon_id IS NULL LIMIT 1`,
          [normalized]
        )).rows[0]
      : undefined);

    if (existing && isOwnerRole(existing) && role === "customer") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "این کاربر از قبل مدیر است" }, { status: 409 });
    }

    let userId: string;
    if (existing) {
      userId = existing.id;
      const targetSalonId = salonId || existing.salon_id;
      if (hasRoles) {
        await client.query(
          `UPDATE users
           SET phone = $1, name = $2, "role" = $3,
               roles = CASE WHEN $3 = 'owner'
                 THEN ARRAY['customer', 'owner']::TEXT[]
                 ELSE ARRAY['customer']::TEXT[] END,
               salon_id = COALESCE($4, salon_id)
           WHERE id = $5 AND (salon_id = $4 OR salon_id IS NULL)`,
          [normalized, name, role, targetSalonId, userId]
        );
      } else {
        await client.query(
          `UPDATE users
           SET phone = $1, name = $2, "role" = $3, salon_id = COALESCE($4, salon_id)
           WHERE id = $5 AND (salon_id = $4 OR salon_id IS NULL)`,
          [normalized, name, role, targetSalonId, userId]
        );
      }
    } else {
      userId = crypto.randomUUID();
      if (hasRoles) {
        if (salonId) {
          await client.query(
            `INSERT INTO users (id, phone, pin, name, "role", roles, salon_id)
             VALUES ($1, $2, '', $3, $4, $5::TEXT[], $6)`,
            [userId, normalized, name, role, role === "owner" ? ["customer", "owner"] : ["customer"], salonId]
          );
        } else {
          await client.query(
            `INSERT INTO users (id, phone, pin, name, "role", roles)
             VALUES ($1, $2, '', $3, $4, $5::TEXT[])`,
            [userId, normalized, name, role, role === "owner" ? ["customer", "owner"] : ["customer"]]
          );
        }
      } else if (salonId) {
        await client.query(
          `INSERT INTO users (id, phone, pin, name, "role", salon_id)
           VALUES ($1, $2, '', $3, $4, $5)`,
          [userId, normalized, name, role, salonId]
        );
      } else {
        await client.query(
          `INSERT INTO users (id, phone, pin, name, "role")
           VALUES ($1, $2, '', $3, $4)`,
          [userId, normalized, name, role]
        );
      }
    }

    await client.query("COMMIT");
    void logActivity({
      eventType: "user_registered",
      entityType: "user",
      entityId: userId,
      description: `${role === "owner" ? "مدیر" : "کاربر"} جدید ${name} توسط مدیر اضافه شد`,
      metadata: { phone: normalized, name, role, createdBy: owner.id },
    });
    return NextResponse.json({ success: true, userId, role });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { /* ignore rollback failure */ }
    }
    const duplicate = duplicateUserResponse(error);
    if (duplicate) return duplicate;
    console.error("Failed to create user:", error);
    return NextResponse.json({ error: "خطا در ایجاد کاربر" }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const body = await request.json() as {
      userId?: unknown;
      phone?: unknown;
      name?: unknown;
      role?: unknown;
      locked?: unknown;
    };
    const userId = typeof body.userId === "string" ? body.userId : "";
    if (!userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });

    const salonId = await resolveSalonId();
    const hasRolesResult = await sql.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
       ) AS has_roles`
    );
    const hasRoles = Boolean(hasRolesResult.rows[0]?.has_roles);
    const roleColumns = hasRoles ? ', roles' : '';
    const targetResult = salonId
      ? await sql.query(`SELECT id, phone, name, "role"${roleColumns} FROM users WHERE id = $1 AND salon_id = $2`, [userId, salonId])
      : await sql.query(`SELECT id, phone, name, "role"${roleColumns} FROM users WHERE id = $1`);
    const target = targetResult.rows[0];
    if (!target) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });

    if (body.role !== undefined) {
      if (typeof body.role !== "string" || !VALID_ROLES.has(body.role)) {
        return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
      }
      if (userId === owner.id && body.role !== "owner") {
        return NextResponse.json({ error: "نقش خود را نمی‌توانید تغییر دهید" }, { status: 400 });
      }
      if (userId !== owner.id && isOwnerRole(target) && body.role !== "owner") {
        return NextResponse.json({ error: "تغییر نقش مدیر دیگر مجاز نیست" }, { status: 403 });
      }
    }

    const phone = body.phone !== undefined
      ? typeof body.phone === "string" ? normalizeDigits(body.phone.trim()) : ""
      : null;
    const name = body.name !== undefined
      ? typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""
      : null;
    if (phone !== null && !isValidIranianPhone(phone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (name === "") return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });

    const updateArgs = [phone, name, body.role ?? null, userId];
    const updateWhere = salonId ? " WHERE id = $4 AND salon_id = $5" : " WHERE id = $4";
    const updateParams = salonId ? [...updateArgs, salonId] : updateArgs;
    const roleSet = hasRoles
      ? `, roles = CASE WHEN $3 = 'owner' THEN ARRAY['customer', 'owner']::TEXT[]
                       WHEN $3 = 'customer' THEN ARRAY['customer']::TEXT[] ELSE roles END`
      : "";
    await sql.query(
      `UPDATE users SET phone = COALESCE($1, phone), name = COALESCE($2, name),
         "role" = COALESCE($3, "role")${roleSet}${updateWhere}`,
      updateParams
    );

    if (typeof body.locked === "boolean") {
      const lockedUntil = body.locked
        ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
        : null;
      if (salonId) {
        await sql.query("UPDATE users SET locked_until = $1 WHERE id = $2 AND salon_id = $3", [lockedUntil, userId, salonId]);
      } else {
        await sql.query("UPDATE users SET locked_until = $1 WHERE id = $2", [lockedUntil, userId]);
      }
    }

    void logActivity({
      eventType: "user_updated",
      entityType: "user",
      entityId: userId,
      description: "کاربر به‌روزرسانی شد",
      metadata: { userId, fields: Object.keys(body).filter((key) => key !== "userId") },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const duplicate = duplicateUserResponse(error);
    if (duplicate) return duplicate;
    console.error("User update error:", error);
    return NextResponse.json({ error: "خطا در به‌روزرسانی کاربر" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId } = await request.json() as { userId?: unknown };
    if (typeof userId !== "string" || !userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });
    if (userId === owner.id) return NextResponse.json({ error: "نمی‌توانید حساب خود را حذف کنید" }, { status: 400 });

    const salonId = await resolveSalonId();
    const hasRolesResult = await sql.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
       ) AS has_roles`
    );
    const hasRoles = Boolean(hasRolesResult.rows[0]?.has_roles);
    const roleColumns = hasRoles ? ', roles' : '';
    const targetResult = salonId
      ? await sql.query(`SELECT "role"${roleColumns} FROM users WHERE id = $1 AND salon_id = $2`, [userId, salonId])
      : await sql.query(`SELECT "role"${roleColumns} FROM users WHERE id = $1`);
    if (targetResult.rows[0] && isOwnerRole(targetResult.rows[0])) {
      return NextResponse.json({ error: "حذف مدیر مجاز نیست" }, { status: 400 });
    }

    if (salonId) {
      await sql.query("DELETE FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId]);
    } else {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    }
    void logActivity({ eventType: "user_deleted", entityType: "user", entityId: userId, description: "کاربر حذف شد", metadata: { userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json({ error: "خطا در حذف کاربر" }, { status: 500 });
  }
}
