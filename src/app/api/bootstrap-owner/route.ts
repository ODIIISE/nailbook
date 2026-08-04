import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { signCustomerSession } from "@/lib/customer-auth";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";
import { getSalonId } from "@/lib/multi-tenant";

type BootstrapUserRow = {
  id: string;
  phone: string;
  name: string;
  role: string;
  roles: string[];
  session_version?: number;
};

/**
 * Bootstrap the first owner account.
 *
 * This route is intentionally available only for the initial setup. The
 * database advisory lock makes the "no owners yet" check and promotion one
 * atomic critical section, so two first-time requests cannot both become
 * owners during a race. In salon deployments, ownership is scoped to the
 * tenant's salon_id so one salon's bootstrap cannot claim another's install.
 */
export async function POST(request: NextRequest) {
  let client;
  try {
    const body = await request.json();
    const { phone, name } = body ?? {};

    if (!phone) {
      return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
    }

    const normalizedPhone = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalizedPhone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    const ownerName = typeof name === "string" ? name.trim().slice(0, 100) || "مدیر" : "مدیر";
    const configuredSetupSecret = process.env.BOOTSTRAP_OWNER_SECRET?.trim();
    const suppliedSetupSecret = typeof body.setupSecret === "string" ? body.setupSecret : "";
    // An unauthenticated first-owner endpoint is a privilege-escalation path:
    // anyone who reaches it could claim the empty installation. Require an
    // operator-provided deployment secret everywhere except local development;
    // Vercel preview/staging deployments must not be claimable either.
    if (process.env.NODE_ENV !== "development" && (!configuredSetupSecret || suppliedSetupSecret !== configuredSetupSecret)) {
      return NextResponse.json({ error: "راه‌اندازی اولیه نیاز به کلید محرمانه دارد" }, { status: 403 });
    }

    client = await sql.connect();
    await client.query("BEGIN");

    // Serialize all first-owner bootstrap attempts across serverless instances.
    const salonId = getSalonId();
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["nailbook-bootstrap-owner"]);

    const { rows: columnRows } = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
       ) AS has_roles`
    );
    const hasRoles = Boolean(columnRows[0]?.has_roles);
    const { rows: versionColumnRows } = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'session_version'
       ) AS has_session_version`
    );
    const hasSessionVersion = Boolean(versionColumnRows[0]?.has_session_version);

    let ownerCount = 0;
    const countOwnerSql = hasRoles
      ? `SELECT COUNT(*)::int AS count FROM users WHERE ('owner' = ANY(roles) OR "role" = 'owner')`
      : `SELECT COUNT(*)::int AS count FROM users WHERE "role" = 'owner'`;
    const countOwnerParams: string[] = [];
    if (salonId) {
      const { rows } = await client.query(`${countOwnerSql} AND salon_id = $1`, [salonId]);
      ownerCount = Number(rows[0]?.count || 0);
    } else {
      const { rows } = await client.query(countOwnerSql, countOwnerParams);
      ownerCount = Number(rows[0]?.count || 0);
    }

    if (ownerCount > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "اکانت مدیر از قبل وجود دارد. از صفحه مدیریت کاربران استفاده کنید." },
        { status: 403 }
      );
    }

    let rows: BootstrapUserRow[];
    if (hasRoles) {
      const result = salonId
        ? await client.query(
            `INSERT INTO users (phone, pin, name, "role", roles, salon_id)
             VALUES ($1, '', $2, 'owner', ARRAY['customer','owner']::TEXT[], $3)
             ON CONFLICT (salon_id, phone) WHERE salon_id IS NOT NULL
             DO UPDATE
               SET roles = ARRAY(SELECT DISTINCT unnest(users.roles || ARRAY['owner']::TEXT[])),
                   name = COALESCE(EXCLUDED.name, users.name),
                   "role" = CASE WHEN 'owner' = ANY(users.roles) THEN users."role" ELSE 'owner' END
             RETURNING id, phone, name, "role", roles`,
            [normalizedPhone, ownerName, salonId]
          )
        : await client.query(
            `INSERT INTO users (phone, pin, name, "role", roles)
             VALUES ($1, '', $2, 'owner', ARRAY['customer','owner']::TEXT[])
             ON CONFLICT (phone) DO UPDATE
               SET roles = ARRAY(SELECT DISTINCT unnest(users.roles || ARRAY['owner']::TEXT[])),
                   name = COALESCE(EXCLUDED.name, users.name),
                   "role" = CASE WHEN 'owner' = ANY(users.roles) THEN users."role" ELSE 'owner' END
             RETURNING id, phone, name, "role", roles`,
            [normalizedPhone, ownerName]
          );
      rows = result.rows as BootstrapUserRow[];
    } else {
      const result = salonId
        ? await client.query(
            `INSERT INTO users (phone, pin, name, "role", salon_id)
             VALUES ($1, '', $2, 'owner', $3)
             ON CONFLICT (salon_id, phone) WHERE salon_id IS NOT NULL
             DO UPDATE
               SET name = COALESCE(EXCLUDED.name, users.name), "role" = 'owner'
             RETURNING id, phone, name, "role"`,
            [normalizedPhone, ownerName, salonId]
          )
        : await client.query(
            `INSERT INTO users (phone, pin, name, "role")
             VALUES ($1, '', $2, 'owner')
             ON CONFLICT (phone) DO UPDATE
               SET name = COALESCE(EXCLUDED.name, users.name), "role" = 'owner'
             RETURNING id, phone, name, "role"`,
            [normalizedPhone, ownerName]
          );
      rows = result.rows.map((row: Omit<BootstrapUserRow, "roles">) => ({
        ...row,
        roles: ["customer", "owner"],
      }));
    }

    if (!rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "خطای ایجاد اکانت مدیر" }, { status: 500 });
    }

    let sessionVersion = 0;
    if (hasSessionVersion) {
      const { rows: versionRows } = await client.query(
        "SELECT session_version FROM users WHERE id = $1",
        [rows[0].id]
      );
      sessionVersion = Number(versionRows[0]?.session_version) || 0;
    }

    await client.query("COMMIT");

    const userId = rows[0].id;
    const response = NextResponse.json({ success: true, userId, user: { ...rows[0], session_version: sessionVersion } });
    response.cookies.set("session", signCustomerSession(userId, sessionVersion), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { /* ignore rollback failure */ }
    }
    console.error("Bootstrap owner error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
