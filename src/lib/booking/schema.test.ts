import { describe, it, expect } from "vitest";
import {
  bookingRequestSchema,
  manualBookingRequestSchema,
} from "./schema";

const validBooking = {
  phone: "09357149901",
  service_id: "svc-1",
  date_gregorian: "2026-08-30",
  start_time: "10:00",
  end_time: "11:30",
  customer_name: "مریم رضایی",
};

describe("bookingRequestSchema", () => {
  it("accepts a valid booking and defaults selected_addons", () => {
    const parsed = bookingRequestSchema.parse(validBooking);
    expect(parsed.selected_addons).toEqual([]);
    expect(parsed.date_gregorian).toBe("2026-08-30");
  });

  it("accepts a single-digit hour (the server must handle it numerically)", () => {
    expect(() =>
      bookingRequestSchema.parse({ ...validBooking, start_time: "9:30", end_time: "10:30" })
    ).not.toThrow();
  });

  it("rejects non ISO-shaped dates", () => {
    expect(() =>
      bookingRequestSchema.parse({ ...validBooking, date_gregorian: "2026/08/30" })
    ).toThrow();
    expect(() =>
      bookingRequestSchema.parse({ ...validBooking, date_gregorian: "1405/06/08" })
    ).toThrow();
  });

  it("rejects out-of-range times", () => {
    expect(() =>
      bookingRequestSchema.parse({ ...validBooking, end_time: "24:00" })
    ).toThrow();
    expect(() =>
      bookingRequestSchema.parse({ ...validBooking, start_time: "9:5" })
    ).toThrow();
  });

  it("requires a non-empty customer name", () => {
    expect(() =>
      bookingRequestSchema.parse({ ...validBooking, customer_name: "   " })
    ).toThrow();
  });

  it("ignores a client-supplied user_id without failing", () => {
    const parsed = bookingRequestSchema.parse({ ...validBooking, user_id: "spoofed" });
    expect(parsed.user_id).toBe("spoofed"); // carried but never trusted server-side
  });
});

describe("manualBookingRequestSchema (owner bookings)", () => {
  it("requires two-digit hours, unlike the customer schema", () => {
    expect(() =>
      manualBookingRequestSchema.parse({
        customer_phone: "09357149901",
        service_id: "svc-1",
        date_gregorian: "2026-08-30",
        start_time: "9:30",
        end_time: "10:30",
      })
    ).toThrow();
    expect(() =>
      manualBookingRequestSchema.parse({
        customer_phone: "09357149901",
        service_id: "svc-1",
        date_gregorian: "2026-08-30",
        start_time: "09:30",
        end_time: "10:30",
      })
    ).not.toThrow();
  });

  it("defaults customer_name to empty (guest bookings allowed)", () => {
    const parsed = manualBookingRequestSchema.parse({
      customer_phone: "09357149901",
      service_id: "svc-1",
      date_gregorian: "2026-08-30",
      start_time: "09:30",
      end_time: "10:30",
    });
    expect(parsed.customer_name).toBe("");
  });
});
