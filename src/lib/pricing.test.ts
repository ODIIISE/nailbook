import { describe, it, expect } from "vitest";
import { calculateBookingPrice, calculateEarnings } from "./pricing";
import { parseGregorianDateKey } from "./time";
import type { Booking, Service, Addon } from "./types";

describe("calculateBookingPrice", () => {
  const services: Service[] = [
    {
      id: "s1",
      name: "Gelish",
      description: "",
      duration_minutes: 45,
      price: 350000,
      is_active: true,
      sort_order: 1,
      addon_ids: ["a1", "a2"],
      priority_score: 7,
      best_for: [],
    },
  ];

  const addons: Addon[] = [
    { id: "a1", name: "Simple Design", price: 50000, duration_minutes: 10, is_active: true, sort_order: 1 },
    { id: "a2", name: "Nail Stone", price: 30000, duration_minutes: 5, is_active: true, sort_order: 2 },
  ];

  it("should calculate service price only", () => {
    const booking: Booking = {
      id: "b1",
      service_id: "s1",
      selected_addons: [],
      customer_name: "Test",
      customer_phone: "09121234567",
      date: "1405/04/15",
      date_gregorian: "2026-07-14",
      start_time: "10:00",
      end_time: "10:45",
      status: "confirmed",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
    };

    expect(calculateBookingPrice(booking, services, addons)).toBe(350000);
  });

  it("should calculate service + addons price", () => {
    const booking: Booking = {
      id: "b2",
      service_id: "s1",
      selected_addons: ["a1", "a2"],
      customer_name: "Test",
      customer_phone: "09121234567",
      date: "1405/04/15",
      date_gregorian: "2026-07-14",
      start_time: "10:00",
      end_time: "11:00",
      status: "confirmed",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
    };

    // 350000 + 50000 + 30000 = 430000
    expect(calculateBookingPrice(booking, services, addons)).toBe(430000);
  });

  it("prefers the creation-time price snapshot when present", () => {
    const booking: Booking = {
      id: "b-snap",
      service_id: "nonexistent-deleted-service",
      selected_addons: [],
      customer_name: "Old Customer",
      customer_phone: "09121234567",
      date: "1404/01/10",
      date_gregorian: "2025-03-30",
      start_time: "10:00",
      end_time: "10:45",
      status: "confirmed",
      phone_verified: true,
      paid: true,
      created_at: new Date().toISOString(),
      service_name: "خدمت حذف‌شده",
      price_total: 500000,
    };

    // Service no longer exists (would re-price to 0) — the snapshot wins.
    expect(calculateBookingPrice(booking, [], [])).toBe(500000);
  });

  it("should handle missing service gracefully", () => {
    const booking: Booking = {
      id: "b3",
      service_id: "nonexistent",
      selected_addons: [],
      customer_name: "Test",
      customer_phone: "09121234567",
      date: "1405/04/15",
      date_gregorian: "2026-07-14",
      start_time: "10:00",
      end_time: "10:45",
      status: "confirmed",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
    };

    expect(calculateBookingPrice(booking, services, addons)).toBe(0);
  });
});

describe("calculateEarnings", () => {
  const services: Service[] = [
    {
      id: "s1",
      name: "Gelish",
      description: "",
      duration_minutes: 45,
      price: 350000,
      is_active: true,
      sort_order: 1,
      addon_ids: [],
      priority_score: 7,
      best_for: [],
    },
  ];

  const addons: Addon[] = [];

  it("excludes pending bookings from revenue (unverified spam must not inflate طلب)", () => {
    const pendingBooking: Booking = {
      id: "b-pending",
      service_id: "s1",
      selected_addons: [],
      customer_name: "Spam",
      customer_phone: "09121234567",
      date: "1405/04/15",
      date_gregorian: "2026-07-14",
      start_time: "12:00",
      end_time: "12:45",
      status: "pending",
      phone_verified: false,
      paid: false,
      created_at: new Date().toISOString(),
    };
    const result = calculateEarnings(
      [pendingBooking],
      services,
      addons,
      parseGregorianDateKey("2026-07-14"),
      parseGregorianDateKey("2026-07-14")
    );
    expect(result.total).toBe(0);
    expect(result.count).toBe(0);
  });

  const bookings: Booking[] = [
    {
      id: "b1",
      service_id: "s1",
      selected_addons: [],
      customer_name: "Alice",
      customer_phone: "09121234567",
      date: "1405/04/15",
      date_gregorian: "2026-07-14",
      start_time: "10:00",
      end_time: "10:45",
      status: "confirmed",
      phone_verified: true,
      paid: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "b2",
      service_id: "s1",
      selected_addons: [],
      customer_name: "Bob",
      customer_phone: "09351234567",
      date: "1405/04/15",
      date_gregorian: "2026-07-14",
      start_time: "11:00",
      end_time: "11:45",
      status: "confirmed",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
    },
  ];

  it("should calculate earnings for a date range", () => {
    const start = new Date("2026-07-14");
    const end = new Date("2026-07-14T23:59:59");

    const result = calculateEarnings(bookings, services, addons, start, end);

    expect(result.count).toBe(2);
    expect(result.paid).toBe(350000);
    expect(result.unpaid).toBe(350000);
    expect(result.total).toBe(700000);
    expect(result.paidCount).toBe(1);
    expect(result.unpaidCount).toBe(1);
  });

  it("should exclude cancelled bookings", () => {
    const cancelledBookings: Booking[] = [
      {
        ...bookings[0],
        status: "cancelled",
      },
    ];

    const start = new Date("2026-07-14");
    const end = new Date("2026-07-14T23:59:59");

    const result = calculateEarnings(cancelledBookings, services, addons, start, end);

    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
  });

  it("should exclude bookings outside date range", () => {
    const start = new Date("2026-07-15");
    const end = new Date("2026-07-15T23:59:59");

    const result = calculateEarnings(bookings, services, addons, start, end);

    expect(result.count).toBe(0);
    expect(result.total).toBe(0);
  });
});
