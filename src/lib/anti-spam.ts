import { sql } from "@vercel/postgres";

const MAX_BOOKINGS_PER_DAY = 3;
const COOLDOWN_MINUTES = 120;

export interface AntiSpamResult {
  allowed: boolean;
  error?: string;
}

export async function checkAntiSpam(phone: string): Promise<AntiSpamResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { rows } = await sql`
    SELECT COUNT(*) as count FROM bookings
    WHERE customer_phone = ${phone}
    AND created_at >= ${today.toISOString()}
    AND status IN ('confirmed', 'pending')
  `;
  const todayBookings = parseInt(rows[0]?.count || "0");

  if (todayBookings >= MAX_BOOKINGS_PER_DAY) {
    return {
      allowed: false,
      error: `شما امروز قبلاً ${MAX_BOOKINGS_PER_DAY} رزرو انجام داده‌اید. لطفاً فردا تلاش کنید.`,
    };
  }

  const cooldownTime = new Date();
  cooldownTime.setMinutes(cooldownTime.getMinutes() - COOLDOWN_MINUTES);

  const { rows: recentRows } = await sql`
    SELECT created_at FROM bookings
    WHERE customer_phone = ${phone}
    AND created_at >= ${cooldownTime.toISOString()}
    AND status IN ('confirmed', 'pending')
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (recentRows[0]) {
    const lastBookingTime = new Date(recentRows[0].created_at);
    const minutesSince = Math.floor(
      (Date.now() - lastBookingTime.getTime()) / 60000
    );
    const minutesLeft = COOLDOWN_MINUTES - minutesSince;

    return {
      allowed: false,
      error: `لطفاً ${minutesLeft} دقیقه دیگر صبر کنید و دوباره تلاش کنید.`,
    };
  }

  return { allowed: true };
}
