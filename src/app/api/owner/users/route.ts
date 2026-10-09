import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql, type VercelPoolClient } from "@vercel/postgres";
import { requireStaff, staffAuthError } from "@/lib/owner-auth";
import { logActivity } from "@/lib/db/activity-log";
import { isValidIranianPhone, normalizeDigits } from "@/lib/digits";
import { resolveSalonId } from "@/lib/multi-tenant";

const VALID_ROLES = new Set(["customer", "owner", "manager", "artist"]);

type UserRole = "customer" | "owner" | "manager" | "artist";

/** Legacy `role` column only accepts customer/owner — staff roles ride in roles[]. */
function legacyRoleFor(role: UserRole): "customer" | "owner" {
  return role === "owner" ? "owner" : "customer";
}

function rolesFor(role: UserRole): string[] {
  if (role === "owner") return ["customer", "owner"];
  if (role === "manager") return ["customer", "manager"];
  if (role === "artist") return ["customer", "artist"];
  return ["customer"];
}

function displayRole(row: { role?: unknown; roles?: unknown }): string {
  if (Array.isArray(row.roles)) {
    if (row.roles.includes("owner")) return "owner";
    if (row.roles.includes("manager")) return "manager";
    if (row.roles.includes("artist")) return "artist";
  }
  if (typeof row.roles === "string") {
    if (/\bowner\b/.test(row.roles)) return "owner";
    if (/\bmanager\b/.test(row.roles)) return "manager";
    if (/\bartist\b/.test(row.roles)) return "artist";
  }
  return isOwnerRole(row) ? "owner" : "customer";
}

/** Columns from migrations 025/026 — absent until the runner applies them. */
const PROFILE_COLUMNS = ["specialty", "work_days", "service_ids", "sms_reminders", "offers", "note"] as const;

async function existingProfileColumns(): Promise<Set<string>> {
  try {
    const { rows } = await sql.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    const present = new Set(rows.map((r) => String(r.column_name)));
    return new Set(PROFILE_COLUMNS.filter((c) => present.has(c)));
  } catch {
    return new Set();
  }
}

function parseWorkDays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)) return null;
  return [...new Set(value as number[])].sort();
}

function parseServiceIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((id) => typeof id === "string" && id.length > 0 && id.length <= 100)) return null;
  return [...new Set(value as string[])];
}

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

async function existingProfileColumnsTxn(client: VercelPoolClient): Promise<Set<string>> {
  try {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    const present = new Set(rows.map((r) => String(r.column_name)));
    return new Set(PROFILE_COLUMNS.filter((c) => present.has(c)));
  } catch {
    return new Set();
  }
}

/** Write artist/prefs/note fields when the columns exist (migrations 025/026).
 *  Only keys present in `profile` are written — absent fields keep stored values. */
async function writeProfileColumns(
  query: (text: string, values?: unknown[]) => Promise<unknown>,
  userId: string,
  profileCols: Set<string>,
  profile: Partial<{ specialty: string; workDays: number[]; serviceIds: string[]; smsReminders: boolean; offers: boolean; note: string }>
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, value: unknown, json: boolean) => {
    if (value === undefined || !profileCols.has(col)) return;
    params.push(json ? JSON.stringify(value) : value);
    sets.push(`${col} = $${params.length}${json ? "::jsonb" : ""}`);
  };
  push("specialty", profile.specialty, false);
  push("work_days", profile.workDays, true);
  push("service_ids", profile.serviceIds, true);
  push("sms_reminders", profile.smsReminders, false);
  push("offers", profile.offers, false);
  push("note", profile.note, false);
  if (sets.length === 0) return;
  params.push(userId);
  await query(`UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}`, params);
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
    const auth = await requireStaff(request, "users.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });

    const salonId = await resolveSalonId();
    const hasRolesResult = await sql.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
       ) AS has_roles`
    );
    const hasRoles = Boolean(hasRolesResult.rows[0]?.has_roles);
    const profileCols = await existingProfileColumns();
    const extraSelect = [...profileCols].map((c) => `, ${c}`).join("");
    const result = salonId
      ? await sql.query(
          `SELECT id, phone, name, "role"${hasRoles ? ", roles" : ""}${extraSelect}, locked_until, created_at
           FROM users WHERE salon_id = $1 ORDER BY created_at DESC`,
          [salonId]
        )
      : await sql.query(
          `SELECT id, phone, name, "role"${hasRoles ? ", roles" : ""}${extraSelect}, locked_until, created_at
           FROM users ORDER BY created_at DESC`
        );
    return NextResponse.json(result.rows.map((row) => ({
      ...row,
      role: displayRole(row),
      work_days: Array.isArray(row.work_days) ? row.work_days : [],
      service_ids: Array.isArray(row.service_ids) ? row.service_ids : [],
    })));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

/** Create a customer, artist, manager or owner from the staff tenant. */
export async function POST(request: NextRequest) {
  let client: VercelPoolClient | null = null;
  try {
    const auth = await requireStaff(request, "users.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });
    const staff = auth.staff;

    const body = await request.json() as {
      phone?: unknown; name?: unknown; role?: unknown;
      specialty?: unknown; work_days?: unknown; service_ids?: unknown;
      sms_reminders?: unknown; offers?: unknown; note?: unknown;
    };
    const normalized = typeof body.phone === "string" ? normalizeDigits(body.phone.trim()) : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const role: UserRole = typeof body.role === "string" && VALID_ROLES.has(body.role)
      ? (body.role as UserRole)
      : "customer";

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

    // Artist profile + prefs (migrations 025/026). Invalid shapes are 400;
    // absent fields keep defaults.
    const specialty = typeof body.specialty === "string" ? body.specialty.trim().slice(0, 100) : "";
    const workDays = body.work_days === undefined ? [] : parseWorkDays(body.work_days);
    if (workDays === null) return NextResponse.json({ error: "روزهای کاری نامعتبر است" }, { status: 400 });
    const serviceIds = body.service_ids === undefined ? [] : parseServiceIds(body.service_ids);
    if (serviceIds === null) return NextResponse.json({ error: "خدمات هنرمند نامعتبر است" }, { status: 400 });
    const smsReminders = body.sms_reminders === undefined ? true : body.sms_reminders === true;
    const offers = body.offers === true;
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    const salonId = await resolveSalonId();
    client = await sql.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [
      `nailbook-owner-users:${salonId || "global"}`,
    ]);

    const hasRoles = await hasRolesColumn(client);
    if ((role === "manager" || role === "artist") && !hasRoles) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
    }
    // Artist service assignments must reference real salon services.
    let validServiceIds: string[] = [];
    if (serviceIds.length > 0) {
      const svcRows = salonId
        ? await client.query(`SELECT id FROM services WHERE salon_id = $1 AND id = ANY($2)`, [salonId, serviceIds])
        : await client.query(`SELECT id FROM services WHERE id = ANY($1)`, [serviceIds]);
      validServiceIds = svcRows.rows.map((r) => String(r.id));
      if (validServiceIds.length !== serviceIds.length) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "خدمت نامعتبر است" }, { status: 400 });
      }
    }
    const profileCols = await existingProfileColumnsTxn(client);
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

    const legacyRole = legacyRoleFor(role);
    const rolesArray = rolesFor(role);
    const profile = { specialty, workDays, serviceIds: validServiceIds, smsReminders, offers, note };

    let userId: string;
    if (existing) {
      userId = existing.id;
      const targetSalonId = salonId || existing.salon_id;
      if (hasRoles) {
        await client.query(
          `UPDATE users
           SET phone = $1, name = $2, "role" = $3,
               roles = $4::TEXT[],
               salon_id = COALESCE($5, salon_id)
           WHERE id = $6 AND (salon_id = $5 OR salon_id IS NULL)`,
          [normalized, name, legacyRole, rolesArray, targetSalonId, userId]
        );
      } else {
        await client.query(
          `UPDATE users
           SET phone = $1, name = $2, "role" = $3, salon_id = COALESCE($4, salon_id)
           WHERE id = $5 AND (salon_id = $4 OR salon_id IS NULL)`,
          [normalized, name, legacyRole, targetSalonId, userId]
        );
      }
      await writeProfileColumns(
        (text, values) => client!.query(text, values),
        userId,
        profileCols,
        profile
      );
    } else {
      userId = crypto.randomUUID();
      if (hasRoles) {
        if (salonId) {
          await client.query(
            `INSERT INTO users (id, phone, pin, name, "role", roles, salon_id)
             VALUES ($1, $2, '', $3, $4, $5::TEXT[], $6)`,
            [userId, normalized, name, legacyRole, rolesArray, salonId]
          );
        } else {
          await client.query(
            `INSERT INTO users (id, phone, pin, name, "role", roles)
             VALUES ($1, $2, '', $3, $4, $5::TEXT[])`,
            [userId, normalized, name, legacyRole, rolesArray]
          );
        }
      } else if (salonId) {
        await client.query(
          `INSERT INTO users (id, phone, pin, name, "role", salon_id)
           VALUES ($1, $2, '', $3, $4, $5)`,
          [userId, normalized, name, legacyRole, salonId]
        );
      } else {
        await client.query(
          `INSERT INTO users (id, phone, pin, name, "role")
           VALUES ($1, $2, '', $3, $4)`,
          [userId, normalized, name, legacyRole]
        );
      }
      await writeProfileColumns(
        (text, values) => client!.query(text, values),
        userId,
        profileCols,
        profile
      );
    }

    await client.query("COMMIT");
    void logActivity({
      eventType: "user_registered",
      entityType: "user",
      entityId: userId,
      description: `${role === "owner" ? "مدیر" : role === "manager" ? "مدیر داخلی" : role === "artist" ? "هنرمند" : "کاربر"} جدید ${name} توسط مدیر اضافه شد`,
      metadata: { phone: normalized, name, role, createdBy: staff.id },
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
    const auth = await requireStaff(request, "users.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });
    const staff = auth.staff;

    const body = await request.json() as {
      userId?: unknown;
      phone?: unknown;
      name?: unknown;
      role?: unknown;
      locked?: unknown;
      specialty?: unknown;
      work_days?: unknown;
      service_ids?: unknown;
      sms_reminders?: unknown;
      offers?: unknown;
      note?: unknown;
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
      if (userId === staff.id && body.role !== displayRole(target)) {
        return NextResponse.json({ error: "نقش خود را نمی‌توانید تغییر دهید" }, { status: 400 });
      }
      if (userId !== staff.id && isOwnerRole(target) && body.role !== "owner") {
        return NextResponse.json({ error: "تغییر نقش مدیر دیگر مجاز نیست" }, { status: 403 });
      }
    }

    // Another owner's login identity (phone), display name, and lock state are
    // off-limits: changing the phone would let this owner OTP-login as them.
    if (userId !== staff.id && isOwnerRole(target)
      && (body.phone !== undefined || body.name !== undefined || body.locked !== undefined)) {
      return NextResponse.json({ error: "تغییر اطلاعات مدیر دیگر مجاز نیست" }, { status: 403 });
    }

    // No self-lockout: blocking your own account is irreversible in-app
    // (locked owners cannot OTP-login to unblock themselves).
    if (userId === staff.id && body.locked === true) {
      return NextResponse.json({ error: "نمی‌توانید حساب خود را قفل کنید" }, { status: 400 });
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

    // Manager/artist ride in roles[] with a legacy-compatible "role" value
    // (the legacy CHECK only allows customer/owner). The base SET never
    // touches "role" — Postgres rejects duplicate SET targets.
    const params: unknown[] = [phone, name];
    let roleSql = "";
    if (body.role !== undefined && body.role !== null) {
      const r = body.role as UserRole;
      if ((r === "manager" || r === "artist") && !hasRoles) {
        return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
      }
      params.push(legacyRoleFor(r));
      roleSql = `, "role" = $${params.length}`;
      if (hasRoles) {
        params.push(rolesFor(r));
        roleSql += `, roles = $${params.length}::TEXT[]`;
      }
    } else if (hasRoles) {
      roleSql = `, roles = CASE WHEN "role" = 'owner' THEN ARRAY['customer', 'owner']::TEXT[]
                                WHEN "role" = 'customer' THEN ARRAY['customer']::TEXT[] ELSE roles END`;
    }
    params.push(userId);
    const whereSql = salonId ? ` WHERE id = $${params.length} AND salon_id = $${params.length + 1}` : ` WHERE id = $${params.length}`;
    if (salonId) params.push(salonId);
    await sql.query(
      `UPDATE users SET phone = COALESCE($1, phone), name = COALESCE($2, name)${roleSql}${whereSql}`,
      params
    );

    // Artist profile + prefs (migrations 025/026). Same shapes as POST.
    const profileCols = await existingProfileColumns();
    const specialty = body.specialty === undefined ? undefined
      : typeof body.specialty === "string" ? body.specialty.trim().slice(0, 100) : null;
    if (specialty === null) return NextResponse.json({ error: "تخصص نامعتبر است" }, { status: 400 });
    const workDays = body.work_days === undefined ? undefined : parseWorkDays(body.work_days);
    if (workDays === null) return NextResponse.json({ error: "روزهای کاری نامعتبر است" }, { status: 400 });
    const serviceIds = body.service_ids === undefined ? undefined : parseServiceIds(body.service_ids);
    if (serviceIds === null) return NextResponse.json({ error: "خدمات هنرمند نامعتبر است" }, { status: 400 });
    if (serviceIds && serviceIds.length > 0) {
      const svcRows = salonId
        ? await sql.query(`SELECT id FROM services WHERE salon_id = $1 AND id = ANY($2)`, [salonId, serviceIds])
        : await sql.query(`SELECT id FROM services WHERE id = ANY($1)`, [serviceIds]);
      if (svcRows.rows.length !== serviceIds.length) {
        return NextResponse.json({ error: "خدمت نامعتبر است" }, { status: 400 });
      }
    }
    if (body.sms_reminders !== undefined && typeof body.sms_reminders !== "boolean") {
      return NextResponse.json({ error: "مقدار نامعتبر است" }, { status: 400 });
    }
    if (body.offers !== undefined && typeof body.offers !== "boolean") {
      return NextResponse.json({ error: "مقدار نامعتبر است" }, { status: 400 });
    }
    const note = body.note === undefined ? undefined
      : typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;
    if (note === null) return NextResponse.json({ error: "یادداشت نامعتبر است" }, { status: 400 });
    await writeProfileColumns(
      (text, values) => sql.query(text, values),
      userId,
      profileCols,
      {
        specialty: specialty,
        workDays: workDays,
        serviceIds: serviceIds,
        smsReminders: body.sms_reminders === undefined ? undefined : body.sms_reminders === true,
        offers: body.offers === undefined ? undefined : body.offers === true,
        note: note,
      }
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
      metadata: {
        userId,
        fields: Object.keys(body).filter((key) => key !== "userId"),
        updatedBy: staff.id,
      },
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
    const auth = await requireStaff(request, "users.manage");
    if (!("staff" in auth)) return NextResponse.json(staffAuthError(auth.status), { status: auth.status });
    const staff = auth.staff;

    const { userId } = await request.json() as { userId?: unknown };
    if (typeof userId !== "string" || !userId) return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });
    if (userId === staff.id) return NextResponse.json({ error: "نمی‌توانید حساب خود را حذف کنید" }, { status: 400 });

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
