import { describe, expect, it, vi } from "vitest";

vi.mock("./time", () => ({
  getTehranDateKey: (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },
  getTehranNow: () => ({ dateKey: "2026-07-14", minutes: 10 * 60 }),
}));

import { generateTimeSlots, type WorkingHours } from "./slots";

const hours: WorkingHours = {
  sat: { open: "10:00", close: "18:00" },
  sun: { open: "10:00", close: "18:00" },
  mon: { open: "10:00", close: "18:00" },
  tue: { open: "10:00", close: "18:00" },
  wed: { open: "10:00", close: "18:00" },
  thu: { open: "10:00", close: "18:00" },
  fri: null,
};

const date = new Date(2026, 6, 15); // Wednesday; fixed and after the mocked "today".

function slotsFor(
  bookings: Array<{ start_time: string; end_time: string }>,
  mode: "hybrid" | "legacy",
  extra: Record<string, unknown> = {}
) {
  return generateTimeSlots(
    hours,
    date,
    60,
    0,
    15,
    0,
    bookings,
    [],
    { optimization_mode: mode, ...extra } as Parameters<typeof generateTimeSlots>[8]
  );
}

describe("hybrid booking recommendations", () => {
  it("keeps every empty-day slot available while surfacing only a bounded shortlist", () => {
    const hybrid = slotsFor([], "hybrid", { suggestion_limit: 3 });
    const legacy = slotsFor([], "legacy");

    expect(hybrid.filter((slot) => slot.available)).toHaveLength(29);
    expect(hybrid.filter((slot) => slot.suggested)).toHaveLength(3);
    expect(hybrid.filter((slot) => slot.score !== undefined).every((slot) => (slot.score ?? 0) >= -100 && (slot.score ?? 0) <= 100)).toBe(true);
    expect(legacy.filter((slot) => slot.suggested)).toHaveLength(0);
  });

  it("preserves the proximity availability boundary for a single booking", () => {
    const bookings = [{ start_time: "12:00", end_time: "13:00" }];
    const hybrid = slotsFor(bookings, "hybrid", { suggestion_limit: 3, proximity_window_hours: 2 });
    const legacy = slotsFor(bookings, "legacy", { proximity_window_hours: 2 });

    expect(hybrid.filter((slot) => slot.available).map((slot) => slot.time)).toEqual(
      legacy.filter((slot) => slot.available).map((slot) => slot.time)
    );
    expect(hybrid.filter((slot) => slot.suggested)).toHaveLength(3);
    expect(legacy.filter((slot) => slot.suggested).length).toBeGreaterThan(3);
    expect(hybrid.find((slot) => slot.suggested)?.recommendation).toBeTruthy();
  });

  it("prioritizes the internal gap without hiding valid choices", () => {
    const bookings = [
      { start_time: "10:00", end_time: "11:00" },
      { start_time: "14:00", end_time: "15:00" },
    ];
    const hybrid = slotsFor(bookings, "hybrid", { suggestion_limit: 3 });
    const legacy = slotsFor(bookings, "legacy");
    const hybridSuggested = hybrid.filter((slot) => slot.suggested);

    expect(hybrid.filter((slot) => slot.available).length).toBe(
      legacy.filter((slot) => slot.available).length
    );
    expect(hybridSuggested).toHaveLength(3);
    expect(hybridSuggested.every((slot) => {
      const minutes = Number(slot.time.slice(0, 2)) * 60 + Number(slot.time.slice(3));
      return minutes >= 11 * 60 && minutes < 14 * 60;
    })).toBe(true);
    expect(hybridSuggested.every((slot) => slot.recommendation === "پر کردن فاصله بین نوبت‌ها" || slot.recommendation === "پر کردن کامل یک فاصله")).toBe(true);
    expect(legacy.filter((slot) => slot.suggested).length).toBeGreaterThan(hybridSuggested.length);
  });

  it("does not let recommendations make an invalid or occupied slot selectable", () => {
    const slots = slotsFor(
      [{ start_time: "12:00", end_time: "13:00" }],
      "hybrid",
      { suggestion_limit: 10 }
    );

    expect(slots.filter((slot) => slot.suggested).every((slot) => slot.available)).toBe(true);
    expect(slots.find((slot) => slot.time === "12:00")?.suggested).toBe(false);
    expect(slots.find((slot) => slot.time === "12:00")?.available).toBe(false);
  });
});
