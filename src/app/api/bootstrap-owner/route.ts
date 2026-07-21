import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { storePin } from "@/lib/pin-hash";
import { signOwnerSession } from "@/lib/owner-auth";

/**
 * Bootstrap the first owner account.
 * Only works when zero owners exist in the database.
 * This solves the chicken-and-egg problem of needing an owner to create owners.
 */
export async function POST(request: NextRequest) {
  try {
    const { phone, pin, name } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "شماره و رمز الزامی است" }, { status: 400 });
    }

    const normalizedPhone = String(phone).trim();
    const cleanPin = String(pin).trim();
    if (cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
      return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
    }

    // Check how many owners exist
    const { rows: existingOwners } = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'owner'`;
    const ownerCount = parseInt(existingOwners[0]?.count || "0");

    if (ownerCount > 0) {
      return NextResponse.json(
        { error: "اکانت مدیر از قبل وجود دارد. از صفحه مدیریت کاربران استفاده کنید." },
        { status: 403 }
      );
    }

    // Check if user with this phone already exists (as customer)
    const { rows: existingUser } = await sql`SELECT id, role FROM users WHERE phone = ${normalizedPhone}`;

    if (existingUser.length > 0 && existingUser[0].role === "owner") {
      return NextResponse.json({ error: "این شماره قبلاً به عنوان مدیر ثبت شده" }, { status: 409 });
    }

    let userId: string;

    if (existingUser.length > 0) {
      // Upgrade existing customer to owner
      userId = existingUser[0].id;
      await sql`
        UPDATE users SET role = 'owner', pin = ${storePin(cleanPin)}, name = ${name || "مدیر"},
        failed_attempts = 0, locked_until = NULL
        WHERE id = ${userId}
      `;
    } else {
      // Create new owner
      const { rows } = await sql`
        INSERT INTO users (phone, pin, name, role)
        VALUES (${normalizedPhone}, ${storePin(cleanPin)}, ${name || "مدیر"}, 'owner')
        RETURNING id
      `;
      userId = rows[0].id;
    }

    const response = NextResponse.json({ success: true, userId });
    response.cookies.set("owner_session", signOwnerSession(userId), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Bootstrap owner error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
