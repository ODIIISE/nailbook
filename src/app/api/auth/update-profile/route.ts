import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { logActivity } from "@/lib/db/activity-log";
import { getSalonId } from "@/lib/multi-tenant";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, name, phone } = body;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "شناسه کاربر الزامی است" }, { status: 400 });
    }

    // Unified session: customer and owner share the same cookie. Must match the supplied userId.
    const sessionUserId = await verifyCustomerSessionWithVersion(request.cookies.get("session")?.value);
    if (sessionUserId !== userId) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const salonId = getSalonId();
    const currentResult = salonId
      ? await sql.query("SELECT name, phone FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId])
      : await sql`SELECT name, phone FROM users WHERE id = ${userId}`;
    const current = currentResult.rows;
    if (!current[0]) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    const oldName = current[0].name || "";
    const oldPhone = typeof current[0].phone === "string" ? current[0].phone : "";

    // Validate and normalize the display name before persisting it.
    if (typeof name !== "string") {
      return NextResponse.json({ error: "نام نامعتبر است" }, { status: 400 });
    }
    const sanitizedName = name.trim().slice(0, 100);
    if (!sanitizedName) {
      return NextResponse.json({ error: "نام الزامی است" }, { status: 400 });
    }

    // Optional phone change. The number is the customer's login identity, so
    // it must be a valid Iranian mobile, stay unique across users, and the
    // booking history recorded under the old number must follow the user.
    let cleanPhone: string | null = null;
    if (phone !== undefined) {
      if (typeof phone !== "string" || !isValidIranianPhone(phone)) {
        return NextResponse.json({ error: "شماره موبایل نامعتبر است" }, { status: 400 });
      }
      cleanPhone = normalizeDigits(phone);
      const existingResult = salonId
        ? await sql.query("SELECT id FROM users WHERE phone = $1 AND id <> $2 AND salon_id = $3", [cleanPhone, userId, salonId])
        : await sql`SELECT id FROM users WHERE phone = ${cleanPhone} AND id <> ${userId}`;
      if (existingResult.rows.length > 0) {
        return NextResponse.json({ error: "این شماره قبلاً برای حساب دیگری ثبت شده است" }, { status: 400 });
      }
    }

    if (salonId) {
      await sql.query(
        "UPDATE users SET name = $1, phone = COALESCE($2, phone) WHERE id = $3 AND salon_id = $4",
        [sanitizedName, cleanPhone, userId, salonId]
      );
    } else {
      await sql`UPDATE users SET name = ${sanitizedName}, phone = COALESCE(${cleanPhone}, phone) WHERE id = ${userId}`;
    }

    if (cleanPhone && oldPhone && cleanPhone !== oldPhone) {
      if (salonId) {
        await sql.query(
          "UPDATE bookings SET customer_phone = $1 WHERE customer_phone = $2 AND (user_id = $3 OR user_id IS NULL)",
          [cleanPhone, oldPhone, userId]
        );
      } else {
        await sql`UPDATE bookings SET customer_phone = ${cleanPhone} WHERE customer_phone = ${oldPhone} AND (user_id = ${userId} OR user_id IS NULL)`;
      }
    }

    logActivity({
      eventType: "user_updated",
      entityType: "user",
      entityId: userId,
      description: `پروفایل کاربر به‌روزرسانی شد (نام: "${oldName}" ← "${sanitizedName}"${cleanPhone && cleanPhone !== oldPhone ? `، شماره: ${oldPhone} ← ${cleanPhone}` : ""})`,
      metadata: { userId, oldName, newName: sanitizedName, oldPhone, newPhone: cleanPhone },
    });

    return NextResponse.json({ success: true, ...(cleanPhone ? { phone: cleanPhone } : {}) });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
