import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { getSalonId } from "@/lib/multi-tenant";

type AuthUserRow = {
  id: string;
  phone: string;
  name: string;
  role: string | null;
  roles: unknown;
};

export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get("session")?.value;
    const userId = await verifyCustomerSessionWithVersion(cookieValue);

    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }    // "role" is a Postgres reserved keyword — must be doubly-quoted even
    // in a SELECT list. Keep a legacy fallback while the roles migration is
    // being rolled out; a missing optional column must not log everyone out.
    const salonId = getSalonId();
    const scoped = salonId
      ? sql<AuthUserRow>`SELECT id, phone, name, "role", roles FROM users WHERE id = ${userId} AND salon_id = ${salonId} LIMIT 1`
      : sql<AuthUserRow>`SELECT id, phone, name, "role", roles FROM users WHERE id = ${userId} LIMIT 1`;
    let rows: AuthUserRow[];
    try {
      const result = await scoped;
      rows = result.rows as AuthUserRow[];
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || "");
      if (code !== "42703" && !/column .*roles.*does not exist/i.test(message)) throw error;
      const result = salonId
        ? await sql<Omit<AuthUserRow, "roles"> & { roles?: never }>`SELECT id, phone, name, "role" FROM users WHERE id = ${userId} AND salon_id = ${salonId} LIMIT 1`
        : await sql<Omit<AuthUserRow, "roles"> & { roles?: never }>`SELECT id, phone, name, "role" FROM users WHERE id = ${userId} LIMIT 1`;
      rows = result.rows.map((row) => ({
        ...row,
        roles: row.role === "owner" ? ["customer", "owner"] : ["customer"],
      })) as AuthUserRow[];
    }

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
