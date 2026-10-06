import type { Booking, Service, Addon } from "./types";
import { parseGregorianDateKey } from "./time";
import { toPersianDigits } from "./jalali";

/** Compact Persian money split for pill typography: 350000 → { amount: "۳۵۰", unit: "هزار" },
 *  1500000 → { amount: "۱٫۵", unit: "میلیون" }, 750 → { amount: "۷۵۰", unit: "" }. */
export function splitCompactPrice(n: number): { amount: string; unit: string } {
  if (!Number.isFinite(n)) return { amount: "۰", unit: "" };
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m % 1 === 0 ? String(m) : m.toFixed(1).replace(".", "٫");
    return { amount: toPersianDigits(s), unit: "میلیون" };
  }
  if (n >= 1000) return { amount: toPersianDigits(Math.round(n / 1000)), unit: "هزار" };
  return { amount: toPersianDigits(n), unit: "" };
}

/** Compact Persian money without currency, e.g. 350000 → "۳۵۰ هزار", 1500000 → "۱٫۵ میلیون". */
export function compactPrice(n: number): string {
  const { amount, unit } = splitCompactPrice(n);
  return unit ? `${amount} ${unit}` : amount;
}

/** Compact Persian money with currency, e.g. 350000 → "۳۵۰ هزار تومان". */
export function compactToman(n: number): string {
  return `${compactPrice(n)} تومان`;
}

export function calculateBookingPrice(
  booking: Booking,
  services: Service[],
  addons: Addon[]
): number {
  // Prefer the creation-time snapshot (migration 022): later price edits or a
  // deleted service must not rewrite historical revenue. Legacy rows without
  // a snapshot keep the re-pricing behavior.
  if (booking.price_total !== null && booking.price_total !== undefined) {
    return booking.price_total;
  }
  const service = services.find((s) => s.id === booking.service_id);
  const servicePrice = Number(service?.price) || 0;

  const addonsPrice = (booking.selected_addons || []).reduce((sum, addonId) => {
    const addon = addons.find((a) => a.id === addonId);
    return sum + (Number(addon?.price) || 0);
  }, 0);

  return servicePrice + addonsPrice;
}

export function calculateEarnings(
  bookings: Booking[],
  services: Service[],
  addons: Addon[],
  startDate: Date,
  endDate: Date
) {
  const filtered = bookings.filter((b) => {
    // Cancelled is dead revenue; pending was never verified (pre-OTP) and
    // counting it inflates "طلب" with spam attempts.
    if (b.status === "cancelled" || b.status === "pending") return false;
    const d = parseGregorianDateKey(b.date_gregorian.split("T")[0]);
    return d >= startDate && d <= endDate;
  });

  let paid = 0;
  let unpaid = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const b of filtered) {
    const price = calculateBookingPrice(b, services, addons);
    if (b.paid) {
      paid += price;
      paidCount++;
    } else {
      unpaid += price;
      unpaidCount++;
    }
  }

  return {
    paid,
    unpaid,
    total: paid + unpaid,
    count: filtered.length,
    paidCount,
    unpaidCount,
  };
}
