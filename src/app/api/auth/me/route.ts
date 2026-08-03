import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { getSalonId } from "@/lib/multi-tenant";

export async function GET(request: NextRequest) {
  try {
    const cookieValue = request.cookies.get("session")?.value;
    const userId = await verifyCustomerSessionWithVersion(cookieValue);

    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const salonId = getSalonId();
    const result = salonId
      ? await sql.query(
          "SELECT id, phone, name, role FROM users WHERE id = $1 AND salon_id = $2 LIMIT 1",
          [userId, salonId]
        )
      : await sql`SELECT id, phone, name, role FROM users WHERE id = ${userId} LIMIT 1`;
    const { rows } = result;

    if (rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = rows[0];
    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, phone: user.phone, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("auth/me error:", error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
