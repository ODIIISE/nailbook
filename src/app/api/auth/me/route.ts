import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";

export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get("session")?.value;
    const userId = await verifyCustomerSessionWithVersion(cookieValue);

    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // "role" is a Postgres reserved keyword — must be doubly-quoted even
    // in a SELECT list.
    const { rows } = await sql`
      SELECT id, phone, name, "role", roles FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = rows[0];
    const rawRoles = user.roles as unknown;
    let rolesArr: string[] = [];
    if (Array.isArray(rawRoles)) rolesArr = rawRoles;
    else if (typeof rawRoles === "string" && rawRoles) {
      rolesArr = rawRoles.replace(/^\{|\}$/g, "").split(",").map((s) => s.replace(/"/g, "").trim()).filter(Boolean);
    }
    if (rolesArr.length === 0) rolesArr = ["customer"];

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role ?? (rolesArr.includes("owner") ? "owner" : "customer"),
        roles: rolesArr,
      },
    });
  } catch (error) {
    console.error("auth/me error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
