import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBootstrap } from "./data";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchBootstrap", () => {
  it("normalizes every section of a full scope=all payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          salon: { id: "salon-1", name: "سالن", working_hours: null, slot_buffer_minutes: "0" },
          services: [{ id: "s1", name: "مانیکور", price: "500", addon_ids: "{a1}", is_popular: 1 }],
          addons: [{ id: "a1", name: "فرنچ", price: "100", duration_minutes: "15" }],
          highlights: [
            {
              id: "h1",
              name: "نمونه",
              images: [{ id: "i1", highlight_id: "h1", image_url: "https://x/y.jpg", caption: "", sort_order: 1 }],
            },
          ],
          bookings: [
            {
              id: "b1",
              date_gregorian: "2026-07-30T00:00:00.000Z",
              start_time: "10:15:00",
              end_time: "11:15:00",
              status: "reserved",
              paid: "false",
            },
          ],
          blockedTimes: [{ date_gregorian: "2026-07-30", start_time: "09:00", end_time: "09:30" }],
        })
      )
    );

    const payload = await fetchBootstrap("all");
    expect(payload).not.toBeNull();
    expect(payload!.salon).toEqual(expect.objectContaining({ id: "salon-1", name: "سالن", slot_buffer_minutes: 0, working_hours: {} }));
    expect(payload!.services![0]).toEqual(expect.objectContaining({ id: "s1", price: 500, addon_ids: ["a1"], is_popular: true }));
    expect(payload!.addons![0]).toEqual(expect.objectContaining({ id: "a1", price: 100, duration_minutes: 15 }));
    expect(payload!.highlights![0].images).toHaveLength(1);
    expect(payload!.bookings![0]).toEqual(expect.objectContaining({ date_gregorian: "2026-07-30", start_time: "10:15", paid: false }));
    expect(payload!.blockedTimes).toEqual([{ date_gregorian: "2026-07-30", start_time: "09:00", end_time: "09:30" }]);
  });

  it("keeps partial payloads: failed sections are null, not discarded wholesale", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          salon: { id: "salon-1", name: "سالن" },
          services: null,
          addons: [{ id: "a1", name: "فرنچ" }],
          highlights: null,
        })
      )
    );

    const payload = await fetchBootstrap("home");
    expect(payload!.salon).toEqual(expect.objectContaining({ id: "salon-1" }));
    expect(payload!.services).toBeNull();
    expect(payload!.addons).toHaveLength(1);
    expect(payload!.highlights).toBeNull();
    // scope=all sections absent on scope=home read as "not requested", not failed
    expect(payload!.bookings).toBeUndefined();
    expect(payload!.blockedTimes).toBeNull();
  });

  it("returns null on non-OK responses so callers fall back to individual endpoints", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "خطای سرور" }), { status: 500 }))
    );
    await expect(fetchBootstrap("all")).resolves.toBeNull();
  });

  it("returns null on malformed JSON instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })));
    await expect(fetchBootstrap("home")).resolves.toBeNull();
  });

  it("drops malformed booking rows while keeping valid ones", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          salon: { id: "s" },
          services: [],
          addons: [],
          highlights: [],
          bookings: [
            { id: "b1", date_gregorian: "2026-07-30", start_time: "10:00", end_time: "11:00", status: "reserved" },
            { id: "broken", date_gregorian: "not-a-date" },
          ],
          blockedTimes: [
            { date_gregorian: "2026-07-30", start_time: "09:00", end_time: "09:30" },
            { date_gregorian: "2026-07-30", start_time: "10:00" },
          ],
        })
      )
    );

    const payload = await fetchBootstrap("all");
    expect(payload!.bookings).toHaveLength(1);
    // blocked rows missing any of the three fields are dropped
    expect(payload!.blockedTimes).toEqual([{ date_gregorian: "2026-07-30", start_time: "09:00", end_time: "09:30" }]);
  });
});
