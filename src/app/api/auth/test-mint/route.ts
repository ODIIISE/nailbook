import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";
import { resolveSalonId } from "@/lib/multi-tenant";
import { verifyCustomerSession, verifyCustomerSessionWithVersion } from "@/lib/customer-auth";
import { verifyOwner } from "@/lib/owner-auth";

/**
 * TEMPORARY TEST HOOK (AUDIT-015) — DELETE AFTER THE LIVE WALK.
 *
 * Secret-gated endpoint used once by the maintainer to run the real-device
 * verification walks without sending SMS to any phone: it mints test users
 * and a fixed verification code directly in the database, so the REAL
 * verify-otp/session/booking machinery is exercised end to end. The cleanup
 * action removes every row the walks created. This file ships for minutes,
 * not days, and is reverted immediately after the run.
 */

const TEST_SECRET = "41df878a0911b224bfd4f918768e680a46e38992a3e2626a";
const FIXED_CODE = "144535";

// Postgres text[] literal — the sql template only accepts primitives as params.
const pgTextArray = (values: string[]) =>
  `{${values.map((v) => `"${v.replace(/"/g, "\\\"")}"`).join(",")}}`;

export async function POST(request: NextRequest) {
  if (TEST_SECRET.length !== 48) return new NextResponse(null, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || body.secret !== TEST_SECRET) {
    return NextResponse.json({ error: "غیرمجاز" }, { status: 404 });
  }

  try {
    if (body.action === "mint") {
      const phone = String(body.phone || "");
      const name = String(body.name || "کاربر آزمایشی");
      const isOwner = body.role === "owner";
      const salonId = await resolveSalonId();
      const userId = crypto.randomUUID();

      // Mirror the owner/users route insert shape (roles array + salon scope).
      if (salonId) {
        await sql`
          INSERT INTO users (id, phone, pin, name, "role", roles, salon_id)
          VALUES (${userId}, ${phone}, '', ${name}, ${isOwner ? "owner" : "customer"},
                  ${pgTextArray(isOwner ? ["customer", "owner"] : ["customer"])}::TEXT[], ${salonId})
        `;
      } else {
        await sql`
          INSERT INTO users (id, phone, pin, name, "role", roles)
          VALUES (${userId}, ${phone}, '', ${name}, ${isOwner ? "owner" : "customer"},
                  ${pgTextArray(isOwner ? ["customer", "owner"] : ["customer"])}::TEXT[])
        `;
      }

      // Fixed-code OTP row — the real verify-otp path reads exactly this table.
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      if (salonId) {
        await sql`
          INSERT INTO otps (salon_id, phone, code, expires_at, attempts)
          VALUES (${salonId}, ${phone}, ${FIXED_CODE}, ${expiresAt}, 0)
          ON CONFLICT (salon_id, phone) WHERE salon_id IS NOT NULL
          DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0
        `;
      } else {
        await sql`
          INSERT INTO otps (phone, code, expires_at, attempts)
          VALUES (${phone}, ${FIXED_CODE}, ${expiresAt}, 0)
          ON CONFLICT (phone)
          DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0
        `;
      }

      return NextResponse.json({ success: true, userId, salonId, code: FIXED_CODE });
    }

    if (body.action === "whoami") {
      // Read-only diagnostic probe: run the REAL verifier against the REAL
      // request cookie and report each intermediate result.
      const cookie = request.cookies.get("session")?.value;
      const userId = await verifyCustomerSessionWithVersion(cookie);
      const verifyResult = verifyCustomerSession(cookie);
      const salonId = await resolveSalonId();
      let bookingProbe: Record<string, unknown> | null = null;
      if (body.bookingId && userId) {
        const rows = salonId
          ? await sql.query("SELECT id, user_id, salon_id, status FROM bookings WHERE id = $1 AND salon_id = $2", [body.bookingId, salonId])
          : await sql.query("SELECT id, user_id, salon_id, status FROM bookings WHERE id = $1", [body.bookingId]);
        const b = rows.rows[0] || null;
        if (b) bookingProbe = { ...b, ownershipMatches: b.user_id === userId };
      }
      return NextResponse.json({
        hasCookie: Boolean(cookie),
        cookieParts: cookie ? cookie.split(":").length : 0,
        legacyVerify: verifyResult,
        versionedVerify: userId,
        salonId,
        bookingProbe,
        success: Boolean(userId),
      });
    }

    if (body.action === "patch-replica") {
      // Replicates src/app/api/bookings/[id]/route.ts PATCH auth sequence
      // exactly, reporting which step diverges.
      const owner = await verifyOwner(request);
      const bookingId = String(body.bookingId || "");
      const salonId = await resolveSalonId();
      const bookingResult = salonId
        ? await sql.query("SELECT id, user_id, customer_phone, status, date_gregorian::text, start_time::text FROM bookings WHERE id = $1 AND salon_id = $2", [bookingId, salonId])
        : await sql.query("SELECT id, user_id, customer_phone, status, date_gregorian::text, start_time::text FROM bookings WHERE id = $1", [bookingId]);
      const booking = bookingResult.rows[0] || null;
      const customerUserId = verifyCustomerSessionWithVersion(request.cookies.get("session")?.value);
      return NextResponse.json({
        ownerFound: Boolean(owner),
        bookingFound: Boolean(booking),
        dbUserId: booking ? booking.user_id : null,
        sessionUserId: customerUserId,
        ownershipMatches: Boolean(booking && customerUserId && booking.user_id === customerUserId),
        wouldReturn401: Boolean(!owner && (!customerUserId || !booking || booking.user_id !== customerUserId)),
      });
    }

    if (body.action === "refresh-otp") {
      // Re-arm the fixed-code OTP row (the 15-minute window expires mid-walk).
      const phone = String(body.phone || "");
      const salonId = await resolveSalonId();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      if (salonId) {
        await sql`
          INSERT INTO otps (salon_id, phone, code, expires_at, attempts)
          VALUES (${salonId}, ${phone}, ${FIXED_CODE}, ${expiresAt}, 0)
          ON CONFLICT (salon_id, phone) WHERE salon_id IS NOT NULL
          DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0
        `;
      } else {
        await sql`
          INSERT INTO otps (phone, code, expires_at, attempts)
          VALUES (${phone}, ${FIXED_CODE}, ${expiresAt}, 0)
          ON CONFLICT (phone)
          DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, attempts = 0
        `;
      }
      return NextResponse.json({ success: true, code: FIXED_CODE });
    }

    if (body.action === "cleanup") {
      const phones: string[] = Array.isArray(body.phones) ? body.phones : [];
      if (!phones.length) return NextResponse.json({ error: "phones required" }, { status: 400 });
      const phonesArray = pgTextArray(phones);

      // Activity log rows referencing these phones (metadata phone or entityId of their users).
      const log1 = await sql`
        DELETE FROM activity_logs
        WHERE metadata->>'phone' = ANY(${phonesArray}::TEXT[])
           OR entity_id IN (SELECT id::text FROM users WHERE phone = ANY(${phonesArray}::TEXT[]))
      `;
      const b = await sql`DELETE FROM bookings WHERE customer_phone = ANY(${phonesArray}::TEXT[])`;
      const o = await sql`DELETE FROM otps WHERE phone = ANY(${phonesArray}::TEXT[])`;
      const u = await sql`DELETE FROM users WHERE phone = ANY(${phonesArray}::TEXT[])`;
      return NextResponse.json({
        success: true,
        deleted: { activity: log1.rowCount, bookings: b.rowCount, otps: o.rowCount, users: u.rowCount },
      });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
