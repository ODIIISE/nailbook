import { supabaseAdmin } from "./supabase/server";

const MAX_BOOKINGS_PER_DAY = 3;
const COOLDOWN_MINUTES = 120;

export interface AntiSpamResult {
  allowed: boolean;
  error?: string;
}

export async function checkAntiSpam(phone: string): Promise<AntiSpamResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: todayBookings } = await supabaseAdmin
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("customer_phone", phone)
    .gte("created_at", today.toISOString())
    .in("status", ["confirmed", "pending"]);

  if (todayBookings && todayBookings >= MAX_BOOKINGS_PER_DAY) {
    return {
      allowed: false,
      error: `شما امروز قبلاً ${MAX_BOOKINGS_PER_DAY} رزرو انجام داده‌اید. لطفاً فردا تلاش کنید.`,
    };
  }

  const cooldownTime = new Date();
  cooldownTime.setMinutes(cooldownTime.getMinutes() - COOLDOWN_MINUTES);

  const { data: recentBooking } = await supabaseAdmin
    .from("bookings")
    .select("created_at")
    .eq("customer_phone", phone)
    .gte("created_at", cooldownTime.toISOString())
    .in("status", ["confirmed", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (recentBooking) {
    const lastBookingTime = new Date(recentBooking.created_at);
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
