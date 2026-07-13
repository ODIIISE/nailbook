import type { Booking, Service, Addon } from "./types";

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
    if (b.status !== "confirmed") return false;
    const d = new Date(b.date_gregorian.split("T")[0]);
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
