import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";
import { hashPin } from "@/lib/pin-hash";
import { logActivity } from "@/lib/db/activity-log";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { userId, pin } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });
    }

    if (!pin || String(pin).length !== 4) {
      return NextResponse.json({ error: "رمز باید ۴ رقمی باشد" }, { status: 400 });
    }

    // Get user info for logging
    const { rows: user } = await sql`SELECT name, phone FROM users WHERE id = ${userId}`;

    const { rows } = await sql`
      UPDATE users SET pin = ${hashPin(String(pin))}, failed_attempts = 0, locked_until = NULL
      WHERE id = ${userId} RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    }

    logActivity({
      eventType: "user_pin_reset",
      entityType: "user",
      entityId: userId,
      description: `رمز کاربر "${user[0]?.name || user[0]?.phone || userId}" بازنشانی شد`,
      metadata: { userId, name: user[0]?.name, phone: user[0]?.phone },
    });

    return NextResponse.json({ success: true, userId: rows[0].id });
  } catch (error) {
    console.error("Reset PIN error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
