import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwnerSession } from "@/lib/owner-auth";
import { verifyCustomerSession } from "@/lib/customer-auth";

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

    // Validate name
    const sanitizedName = (name || "").slice(0, 100);

    await sql`UPDATE users SET name = ${sanitizedName} WHERE id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
