import type { Booking, Service, Addon } from "./types";
import { parseGregorianDateKey } from "./time";
import { toPersianDigits } from "./jalali";

/** Compact Persian money without currency, e.g. 350000 → "۳۵۰ هزار", 1500000 → "۱٫۵ میلیون". */
export function compactPrice(n: number): string {
  if (!Number.isFinite(n)) return "۰";
  if (n < 1000) return toPersianDigits(n);
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const s = m % 1 === 0 ? String(m) : m.toFixed(1).replace(".", "٫");
    return `${toPersianDigits(s)} میلیون`;
  }
  return `${toPersianDigits(Math.round(n / 1000))} هزار`;
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
    if (b.status === "cancelled") return false;
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
