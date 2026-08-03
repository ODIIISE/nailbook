import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { signOwnerSession } from "@/lib/owner-auth";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-config";
import { getSalonId } from "@/lib/multi-tenant";

/**
 * Bootstrap the first owner account.
 * Only works when zero owners exist in the database.
 * This solves the chicken-and-egg problem of needing an owner to create owners.
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

    const salonId = getSalonId();
    // In a salon deployment, bootstrap only considers owners belonging to that salon.
    const ownerCountResult = salonId
      ? await sql.query("SELECT COUNT(*) as count FROM users WHERE role = 'owner' AND salon_id = $1", [salonId])
      : await sql`SELECT COUNT(*) as count FROM users WHERE role = 'owner'`;
    const existingOwners = ownerCountResult.rows;
    const ownerCount = parseInt(existingOwners[0]?.count || "0");

    if (ownerCount > 0) {
      return NextResponse.json(
        { error: "اکانت مدیر از قبل وجود دارد. از صفحه مدیریت کاربران استفاده کنید." },
        { status: 403 }
      );
    }

    // Check if user with this phone already exists in this tenant.
    const existingUserResult = salonId
      ? await sql.query("SELECT id, role FROM users WHERE phone = $1 AND salon_id = $2", [normalizedPhone, salonId])
      : await sql`SELECT id, role FROM users WHERE phone = ${normalizedPhone}`;
    const existingUser = existingUserResult.rows;

    if (existingUser.length > 0 && existingUser[0].role === "owner") {
      return NextResponse.json({ error: "این شماره قبلاً به عنوان مدیر ثبت شده" }, { status: 409 });
    }

    let userId: string;

    if (existingUser.length > 0) {
      // Upgrade existing customer to owner
      userId = existingUser[0].id;
      if (salonId) {
        await sql.query(
          "UPDATE users SET role = 'owner', name = $1, failed_attempts = 0, locked_until = NULL, salon_id = $2 WHERE id = $3",
          [name || "مدیر", salonId, userId]
        );
      } else {
        await sql`
          UPDATE users SET role = 'owner', name = ${name || "مدیر"},
          failed_attempts = 0, locked_until = NULL
          WHERE id = ${userId}
        `;
      }
    } else {
      // Create new owner
      const result = salonId
        ? await sql.query(
            "INSERT INTO users (phone, name, role, salon_id) VALUES ($1, $2, 'owner', $3) RETURNING id",
            [normalizedPhone, name || "مدیر", salonId]
          )
        : await sql`
            INSERT INTO users (phone, name, role)
            VALUES (${normalizedPhone}, ${name || "مدیر"}, 'owner')
            RETURNING id
          `;
      const rows = result.rows;
      userId = rows[0].id;
    }

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set("owner_session", signOwnerSession(userId), {
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
