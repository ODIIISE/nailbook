import { sql } from "@vercel/postgres";
import { getTehranDayStartUtc } from "./time";

const MAX_BOOKINGS_PER_DAY = 3;
const COOLDOWN_MINUTES = 5;

export interface AntiSpamResult {
  allowed: boolean;
  error?: string;
}

export async function checkAntiSpam(
  phone: string,
  salonId: string | null = null
): Promise<AntiSpamResult> {
  try {
    const now = new Date();
    // Count bookings *made* today (Tehran calendar day), not appointments
    // scheduled for today — a customer with appointments today must still be
    // able to book future dates. Scoped to the tenant in salon mode so the
    // shared admin database does not cross-count between salons.
    const dayStart = getTehranDayStartUtc(now);
    const countResult = salonId
      ? await sql`
          SELECT COUNT(*) as count FROM bookings
          WHERE customer_phone = ${phone}
          AND created_at >= ${dayStart.toISOString()}
          AND status IN ('reserved', 'confirmed', 'pending')
          AND (salon_id = ${salonId} OR salon_id IS NULL)
        `
      : await sql`
          SELECT COUNT(*) as count FROM bookings
          WHERE customer_phone = ${phone}
          AND created_at >= ${dayStart.toISOString()}
          AND status IN ('reserved', 'confirmed', 'pending')
        `;
    const todayBookings = parseInt(countResult.rows[0]?.count || "0");

    if (todayBookings >= MAX_BOOKINGS_PER_DAY) {
      return {
        allowed: false,
        error: `شما امروز قبلاً ${MAX_BOOKINGS_PER_DAY} رزرو انجام داده‌اید. لطفاً فردا تلاش کنید.`,
      };
    }

    const cooldownTime = new Date(now.getTime() - COOLDOWN_MINUTES * 60_000);

    const recentResult = salonId
      ? await sql`
          SELECT created_at FROM bookings
          WHERE customer_phone = ${phone}
          AND created_at >= ${cooldownTime.toISOString()}
          AND status IN ('reserved', 'confirmed', 'pending')
          AND (salon_id = ${salonId} OR salon_id IS NULL)
          ORDER BY created_at DESC
          LIMIT 1
        `
      : await sql`
          SELECT created_at FROM bookings
          WHERE customer_phone = ${phone}
          AND created_at >= ${cooldownTime.toISOString()}
          AND status IN ('reserved', 'confirmed', 'pending')
          ORDER BY created_at DESC
          LIMIT 1
        `;

    if (recentResult.rows[0]) {
      const lastBookingTime = new Date(recentResult.rows[0].created_at);
      const minutesSince = Math.floor((Date.now() - lastBookingTime.getTime()) / 60_000);

      if (minutesSince >= COOLDOWN_MINUTES) return { allowed: true };

      const minutesLeft = COOLDOWN_MINUTES - minutesSince;

      return {
        allowed: false,
        error: `لطفاً ${minutesLeft} دقیقه دیگر صبر کنید و دوباره تلاش کنید.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    // Fail-closed: reject if anti-spam check fails (prevents abuse during DB outages)
    console.error("[ANTI-SPAM] Check failed, rejecting booking:", error);
    return { allowed: false, error: "خطا در بررسی امنیتی. لطفاً دوباره تلاش کنید." };
  }
}
