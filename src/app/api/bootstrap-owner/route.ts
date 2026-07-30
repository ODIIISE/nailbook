import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { signCustomerSession } from "@/lib/customer-auth";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";

/**
 * Bootstrap (or upgrade) the first owner account.
 *
 * Unified auth: customers and owners share one "session" cookie. Adding the
 * "owner" role to a user row gives them access to /owner routes without
 * requiring a separate login. If they already have a customer session, they
 * stay signed in.
 *
 * Works when no owners exist in the DB yet, OR when this single phone already
 * exists as a customer.
 */
export async function POST(request: NextRequest) {
  try {
    const { phone, name } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });
    }

    const normalizedPhone = normalizeDigits(String(phone).trim());
    if (!isValidIranianPhone(normalizedPhone)) {
      return NextResponse.json({ error: "شماره موبایل معتبر نیست" }, { status: 400 });
    }

    // Count existing owners (anyone with 'owner' in roles array).
    const { rows: ownerRows } = await sql`SELECT COUNT(*) as count FROM users WHERE 'owner' = ANY(roles)`;
    const ownerCount = parseInt(ownerRows[0]?.count || "0");

    if (ownerCount > 0) {
      return NextResponse.json(
        { error: "اکانت مدیر از قبل وجود دارد. از صفحه مدیریت کاربران استفاده کنید." },
        { status: 403 }
      );
    }

    // Upsert by phone: append 'owner' to existing roles or create new.
    // Note: "role" is a Postgres reserved keyword and must be double-quoted
    // in SELECT / INSERT column lists / UPDATE assignments.
    const { rows } = await sql`
      INSERT INTO users (phone, pin, name, "role", roles)
      VALUES (${normalizedPhone}, '', ${name || "مدیر"}, 'owner', ARRAY['customer','owner']::TEXT[])
      ON CONFLICT (phone) DO UPDATE
        SET roles = ARRAY(SELECT DISTINCT unnest(users.roles || ARRAY['owner']::TEXT[])),
            name = COALESCE(EXCLUDED.name, users.name),
            "role" = CASE WHEN 'owner' = ANY(users.roles) THEN users."role" ELSE 'owner' END
      RETURNING id, phone, name, "role", roles
    `;
    const userId = rows[0].id;

    const response = NextResponse.json({ success: true, userId, user: rows[0] });
    // Unified session cookie - owner and customer share one auth.
    response.cookies.set("session", signCustomerSession(userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Bootstrap owner error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
