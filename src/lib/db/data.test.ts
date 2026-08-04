import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBookings, fetchSalonInfo, fetchServices } from "./data";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("client data readers", () => {
  it("returns an empty booking list for unauthorized or malformed responses", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "غیرمجاز" }), { status: 401 }))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 })));

    await expect(fetchBookings()).resolves.toBeNull();
    await expect(fetchBookings()).resolves.toBeNull();
  });

  it("drops unsafe booking rows and normalizes nullable database fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      jsonResponse([
        {
          id: "booking-1",
          user_id: null,
          service_id: "service-1",
          selected_addons: "{addon-1,addon-2}",
          customer_name: null,
          customer_phone: "09357149901",
          date_gregorian: "2026-07-30T00:00:00.000Z",
          start_time: "10:15:00",
          end_time: "11:15:00",
          status: "reserved",
          paid: "false",
          phone_verified: 1,
        },
        { id: "broken-without-date", service_id: "service-1", date_gregorian: "not-a-date" },
        { date_gregorian: "2026-07-30" },
      ])
    ));

    const bookings = await fetchBookings();
    if (!bookings) throw new Error("expected a valid bookings payload");
    expect(bookings).toHaveLength(2);
    expect(bookings[0]).toEqual(expect.objectContaining({
      id: "booking-1",
      selected_addons: ["addon-1", "addon-2"],
      customer_name: "",
      date_gregorian: "2026-07-30",
      start_time: "10:15",
      end_time: "11:15",
      status: "reserved",
      paid: false,
      phone_verified: true,
    }));
    expect(bookings[1]).toEqual(expect.objectContaining({
      id: "availability-2026-07-30-00:00-00:00",
      service_id: "",
      date_gregorian: "2026-07-30",
    }));
  });

  it("does not throw when a service or salon response has the wrong shape", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: "خطای سرور" }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ id: "salon-1", name: null, working_hours: null })));

    await expect(fetchServices()).resolves.toEqual([]);
    await expect(fetchSalonInfo()).resolves.toEqual(expect.objectContaining({
      id: "salon-1",
      name: "",
      working_hours: {},
    }));
  });
});
