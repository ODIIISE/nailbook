import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sql, type VercelPoolClient } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";
import { isValidIranianPhone, normalizeDigits } from "@/lib/digits";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let query;
    if (search) {
      query = sql`
        SELECT id, phone, name, "role", failed_attempts, locked_until, created_at
        FROM users
        WHERE salon_id = ${id}
        AND (name ILIKE ${`%${search}%`} OR phone ILIKE ${`%${search}%`})
        ORDER BY created_at DESC
        LIMIT 100
      `;
    } else {
      query = sql`
        SELECT id, phone, name, "role", failed_attempts, locked_until, created_at
        FROM users
        WHERE salon_id = ${id}
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }

    const { rows } = await query;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

/**
 * Create or promote a salon user as an owner from the authenticated
 * super-admin panel. This deliberately does not create a PIN: the owner logs
 * in through the existing OTP flow using the phone number supplied here.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let client: VercelPoolClient | null = null;
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id: salonId } = await params;
    const body = await request.json() as { userId?: unknown; phone?: unknown; name?: unknown };
    const requestedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    const normalizedPhone = typeof body.phone === "string" ? normalizeDigits(body.phone.trim()) : "";
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";

    if (!requestedUserId && !isValidIranianPhone(normalizedPhone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });

    client = await sql.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [`nailbook-admin-owner:${salonId}`]);

    const { rows: salonRows } = await client.query("SELECT id FROM salons WHERE id = $1 LIMIT 1", [salonId]);
    if (!salonRows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "سالن یافت نشد" }, { status: 404 });
    }

    const columnResult = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'roles'
       ) AS has_roles`
    );
    const hasRoles = Boolean(columnResult.rows[0]?.has_roles);

    let existingResult = requestedUserId
      ? await client.query(
          `SELECT id, phone, name, "role" FROM users WHERE id = $1 AND salon_id = $2 LIMIT 1`,
          [requestedUserId, salonId]
        )
      : await client.query(
          `SELECT id, phone, name, "role" FROM users WHERE phone = $1 AND salon_id = $2 LIMIT 1`,
          [normalizedPhone, salonId]
        );

    // Legacy single-salon databases may still contain a global user row with
    // salon_id IS NULL and a global phone uniqueness constraint. Reuse and
    // attach that row instead of attempting a duplicate insert.
    if (!requestedUserId && existingResult.rows.length === 0) {
      existingResult = await client.query(
        `SELECT id, phone, name, "role" FROM users WHERE phone = $1 AND salon_id IS NULL LIMIT 1`,
        [normalizedPhone]
      );
    }

    let userId = existingResult.rows[0]?.id as string | undefined;
    if (userId) {
      if (hasRoles) {
        await client.query(
          `UPDATE users
           SET phone = $1,
               name = $2,
               "role" = 'owner',
               roles = ARRAY(
                 SELECT DISTINCT unnest(COALESCE(roles, ARRAY['customer']::TEXT[]) || ARRAY['owner']::TEXT[])
               ),
               salon_id = $4
           WHERE id = $3 AND (salon_id = $4 OR salon_id IS NULL)`,
          [normalizedPhone || existingResult.rows[0].phone, name, userId, salonId]
        );
      } else {
        await client.query(
          `UPDATE users SET phone = $1, name = $2, "role" = 'owner', salon_id = $4 WHERE id = $3 AND (salon_id = $4 OR salon_id IS NULL)`,
          [normalizedPhone || existingResult.rows[0].phone, name, userId, salonId]
        );
      }
    } else {
      userId = crypto.randomUUID();
      if (hasRoles) {
        await client.query(
          `INSERT INTO users (id, phone, pin, name, "role", roles, salon_id)
           VALUES ($1, $2, '', $3, 'owner', ARRAY['customer', 'owner']::TEXT[], $4)`,
          [userId, normalizedPhone, name, salonId]
        );
      } else {
        await client.query(
          `INSERT INTO users (id, phone, pin, name, "role", salon_id)
           VALUES ($1, $2, '', $3, 'owner', $4)`,
          [userId, normalizedPhone, name, salonId]
        );
      }
    }

    const { rows } = await client.query(
      `SELECT id, phone, name, "role" FROM users WHERE id = $1 AND salon_id = $2 LIMIT 1`,
      [userId, salonId]
    );
    await client.query("COMMIT");
    return NextResponse.json({ success: true, user: rows[0] });
  } catch (error) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { /* ignore rollback failure */ }
    }
    console.error("Create/promote salon owner error:", error);
    return NextResponse.json({ error: "خطا در ایجاد مدیر" }, { status: 500 });
  } finally {
    client?.release();
  }
}
