import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwnerSession } from "@/lib/owner-auth";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";

export async function POST(request: NextRequest) {
  try {
    const { userId, name } = await request.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });
    }

    // Verify the caller is the owner or the user themselves
    const ownerUserId = verifyOwnerSession(request.cookies.get("owner_session")?.value);
    const customerUserId = verifyCustomerSession(request.cookies.get("session")?.value);
    if (ownerUserId !== userId && customerUserId !== userId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const salonId = getSalonId();
    const currentResult = salonId
      ? await sql.query("SELECT name FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId])
      : await sql`SELECT name FROM users WHERE id = ${userId}`;
    const current = currentResult.rows;
    if (!current[0]) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    const oldName = current[0].name || "";

    // Validate name
    const sanitizedName = typeof name === "string" ? name.trim().slice(0, 100) : "";

    if (salonId) {
      await sql.query("UPDATE users SET name = $1 WHERE id = $2 AND salon_id = $3", [sanitizedName, userId, salonId]);
    } else {
      await sql`UPDATE users SET name = ${sanitizedName} WHERE id = ${userId}`;
    }

    logActivity({
      eventType: "user_updated",
      entityType: "user",
      entityId: userId,
      description: `نام کاربر از "${oldName}" به "${sanitizedName}" تغییر کرد`,
      metadata: { userId, oldName, newName: sanitizedName },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
