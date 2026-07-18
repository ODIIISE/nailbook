import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwnerSession } from "@/lib/owner-auth";
import { verifyCustomerSession } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";

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

    // Get current name for logging
    const { rows: current } = await sql`SELECT name FROM users WHERE id = ${userId}`;
    const oldName = current[0]?.name || "";

    // Validate name
    const sanitizedName = (name || "").slice(0, 100);

    await sql`UPDATE users SET name = ${sanitizedName} WHERE id = ${userId}`;

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
