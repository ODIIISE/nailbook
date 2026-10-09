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
      ? await sql.query("SELECT name, phone, salon_id FROM users WHERE id = $1 AND salon_id = $2", [userId, salonId])
      : await sql`SELECT name, phone, salon_id FROM users WHERE id = ${userId}`;
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

    const sets = ["name = $1"];
    const vals: unknown[] = [sanitizedName];
    if (cleanPhone) {
      vals.push(cleanPhone);
      sets.push(`phone = $${vals.length}`);
    }
    // Notification prefs (migration 026): only when the columns exist.
    if (body.sms_reminders !== undefined || body.offers !== undefined) {
        let prefCols = new Set<string>();
        try {
          const { rows: colRows } = await sql.query(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'users'
             AND column_name IN ('sms_reminders', 'offers')`
          );
          prefCols = new Set(colRows.map((r) => String(r.column_name)));
        } catch {
          prefCols = new Set();
        }
        if (body.sms_reminders !== undefined) {
          if (typeof body.sms_reminders !== "boolean") {
            return NextResponse.json({ error: "مقدار نامعتبر است" }, { status: 400 });
          }
          if (prefCols.has("sms_reminders")) {
            vals.push(body.sms_reminders);
            sets.push(`sms_reminders = $${vals.length}`);
          }
        }
        if (body.offers !== undefined) {
          if (typeof body.offers !== "boolean") {
            return NextResponse.json({ error: "مقدار نامعتبر است" }, { status: 400 });
          }
          if (prefCols.has("offers")) {
            vals.push(body.offers);
            sets.push(`offers = $${vals.length}`);
          }
        }
      }
      if (salonId) {
        vals.push(userId, salonId);
      await sql.query(
        `UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length - 1} AND salon_id = $${vals.length}`,
        vals
      );
    } else {
      vals.push(userId);
      await sql.query(
        `UPDATE users SET ${sets.join(", ")} WHERE id = $${vals.length}`,
        vals
      );
    }

    if (cleanPhone && oldPhone && cleanPhone !== oldPhone) {
      // Bookings that belong to this user follow the phone change. Guest
      // bookings (user_id IS NULL) can only be matched by phone, so they must
      // be scoped to the user's own salon — otherwise a phone match would
      // rewrite other tenants' bookings in a shared database.
      const userSalonId = typeof current[0].salon_id === "string" ? current[0].salon_id : null;
      if (userSalonId) {
        await sql.query(
          "UPDATE bookings SET customer_phone = $1 WHERE customer_phone = $2 AND (user_id = $3 OR (user_id IS NULL AND salon_id = $4))",
          [cleanPhone, oldPhone, userId, userSalonId]
        );
      } else {
        // User has no salon (legacy/admin mode): only rewrite bookings the
        // user owns; unattributed guest bookings cannot be matched safely.
        await sql.query(
          "UPDATE bookings SET customer_phone = $1 WHERE customer_phone = $2 AND user_id = $3",
          [cleanPhone, oldPhone, userId]
        );
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
