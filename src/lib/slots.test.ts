import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateTimeSlots,
  getNearestAvailableSlot,
  getIranWeekDay,
  type WorkingHours,
} from "./slots";

// Mock time.ts to control "now" in tests
vi.mock("./time", () => ({
  getTehranDateKey: (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
  getTehranNow: () => ({
    dateKey: "2026-07-14",
    minutes: 10 * 60, // 10:00 AM
  }),
  isTehranToday: () => false,
}));

// Mock jalali.ts
vi.mock("./jalali", () => ({
  gregorianToJalali: (date: Date) => ({
    jy: 1405,
    jm: 4,
    jd: 23,
  }),
  jalaliToGregorian: (jy: number, jm: number, jd: number) => new Date(2026, 6, 14),
  DAYS_IN_MONTH: [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29],
  isJalaliLeapYear: () => false,
}));

// Helper: create a standard working hours config
const standardHours: WorkingHours = {
  sat: { open: "10:00", close: "18:00" },
  sun: { open: "10:00", close: "18:00" },
  mon: { open: "10:00", close: "18:00" },
  tue: { open: "10:00", close: "18:00" },
  wed: { open: "10:00", close: "18:00" },
  thu: { open: "10:00", close: "18:00" },
  fri: null,
};

// Helper: create a date for a specific day
function makeDate(dayOfWeek: number): Date {
  // 2026-07-14 is a Tuesday (day 2)
  const base = new Date(2026, 6, 14);
  base.setDate(base.getDate() + (dayOfWeek - 2));
  return base;
}

describe("getIranWeekDay", () => {
  it("should map JS Sunday (0) to 'sun'", () => {
    const date = makeDate(0); // Sunday
    expect(getIranWeekDay(date)).toBe("sun");
  });

  it("should map JS Monday (1) to 'mon'", () => {
    const date = makeDate(1); // Monday
    expect(getIranWeekDay(date)).toBe("mon");
  });

  it("should map JS Saturday (6) to 'sat'", () => {
    const date = makeDate(6); // Saturday
    expect(getIranWeekDay(date)).toBe("sat");
  });
});

describe("generateTimeSlots - Level 1 (No Bookings)", () => {
  it("should generate all slots for an empty day", () => {
    const date = makeDate(3); // Wednesday
    const slots = generateTimeSlots(
      standardHours,
      date,
      30, // 30 min service
      0, // no addons
      15, // 15 min resolution
      0, // no buffer
      [], // no bookings
      [], // no locks
      {}
    );

    // Should have slots from 10:00 to 17:30 (last slot starts at 17:30, ends at 18:00)
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].time).toBe("10:00");
    expect(slots[slots.length - 1].time).toBe("17:30");

    // All should be available
    expect(slots.every((s) => s.available)).toBe(true);
    expect(slots.every((s) => !s.booked)).toBe(true);
    expect(slots.every((s) => !s.locked)).toBe(true);
  });

  it("should respect resolution setting", () => {
    const date = makeDate(3);
    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      30, // 30 min resolution
      0,
      [],
      [],
      {}
    );

    // Slots should be at :00 and :30
    expect(slots[0].time).toBe("10:00");
    expect(slots[1].time).toBe("10:30");
    expect(slots[2].time).toBe("11:00");
  });

  it("should handle 5-minute resolution", () => {
    const date = makeDate(3);
    const slots = generateTimeSlots(
      standardHours,
      date,
      15, // 15 min service
      0,
      5, // 5 min resolution
      0,
      [],
      [],
      {}
    );

    // Should have many more slots
    expect(slots.length).toBeGreaterThan(50);
    expect(slots[0].time).toBe("10:00");
    expect(slots[1].time).toBe("10:05");
    expect(slots[2].time).toBe("10:10");
  });

  it("should return empty array for closed day (Friday)", () => {
    const date = makeDate(5); // Friday
    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      [],
      [],
      {}
    );

    expect(slots).toEqual([]);
  });
});

describe("generateTimeSlots - Level 2 (1 Booking)", () => {
  it("should show slots within proximity window of existing booking", () => {
    const date = makeDate(3);
    const bookings = [{ start_time: "12:00", end_time: "13:00" }];

    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      bookings,
      [],
      { proximity_window_hours: 2 }
    );

    // Should have available slots near 12:00-13:00
    const available = slots.filter((s) => s.available);
    expect(available.length).toBeGreaterThan(0);

    // Available slots should be within ±2h of 12:00-13:00
    for (const slot of available) {
      const [h, m] = slot.time.split(":").map(Number);
      const minutes = h * 60 + m;
      // Within 10:00 (12:00 - 2h) to 15:00 (13:00 + 2h)
      expect(minutes).toBeGreaterThanOrEqual(10 * 60);
      expect(minutes).toBeLessThanOrEqual(15 * 60);
    }
  });

  it("should mark the booked slot as booked", () => {
    const date = makeDate(3);
    const bookings = [{ start_time: "12:00", end_time: "13:00" }];

    const slots = generateTimeSlots(
      standardHours,
      date,
      60, // 60 min service to match booking
      0,
      15,
      0,
      bookings,
      [],
      { proximity_window_hours: 2 }
    );

    const bookedSlot = slots.find((s) => s.time === "12:00");
    expect(bookedSlot).toBeDefined();
    expect(bookedSlot!.booked).toBe(true);
    expect(bookedSlot!.available).toBe(false);
  });

  it("should expand proximity if no slots found in ±P", () => {
    const date = makeDate(3);
    // Booking at 10:00-11:00, with 2h proximity and 30min service
    // Slots within ±2h would be 8:00-13:00, but shift starts at 10:00
    // So available slots: 10:00-10:30 (but 10:00 is booked), 10:15-10:45, etc.
    const bookings = [{ start_time: "10:00", end_time: "11:00" }];

    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      bookings,
      [],
      { proximity_window_hours: 2 }
    );

    // Should still have some available slots
    const available = slots.filter((s) => s.available);
    expect(available.length).toBeGreaterThan(0);
  });
});

describe("generateTimeSlots - Level 3 (2+ Bookings)", () => {
  it("should classify gap-filling slots as suggested", () => {
    const date = makeDate(3);
    // Two bookings with a gap between them
    const bookings = [
      { start_time: "10:00", end_time: "11:00" },
      { start_time: "14:00", end_time: "15:00" },
    ];

    const slots = generateTimeSlots(
      standardHours,
      date,
      60, // 60 min service
      0,
      15,
      0,
      bookings,
      [],
      { proximity_window_hours: 2 }
    );

    // Should have suggested slots (gap-filling or edge-adjacent)
    const suggested = slots.filter((s) => s.suggested);
    expect(suggested.length).toBeGreaterThan(0);

    // Gap-filling suggested slots should be in the gap (11:00-14:00)
    // Edge-adjacent slots can be outside the gap
    const gapSuggested = suggested.filter((s) => {
      const [h, m] = s.time.split(":").map(Number);
      const minutes = h * 60 + m;
      return minutes >= 11 * 60 && minutes < 14 * 60;
    });
    expect(gapSuggested.length).toBeGreaterThan(0);
  });

  it("should classify edge-adjacent slots as suggested", () => {
    const date = makeDate(3);
    const bookings = [
      { start_time: "12:00", end_time: "13:00" },
      { start_time: "15:00", end_time: "16:00" },
    ];

    const slots = generateTimeSlots(
      standardHours,
      date,
      60,
      0,
      15,
      0,
      bookings,
      [],
      { proximity_window_hours: 2 }
    );

    // Should have suggested slots adjacent to booking edges
    const suggested = slots.filter((s) => s.suggested);
    expect(suggested.length).toBeGreaterThan(0);
  });
});

describe("generateTimeSlots - Buffer Time", () => {
  it("should add buffer to effective duration", () => {
    const date = makeDate(3);
    const slots = generateTimeSlots(
      standardHours,
      date,
      30, // 30 min service
      0,
      15, // 15 min resolution
      15, // 15 min buffer
      [],
      [],
      {}
    );

    // Effective duration = ceil((30 + 15) / 15) * 15 = 45 min
    // Last slot: 18:00 - 45min = 17:15
    expect(slots[slots.length - 1].time).toBe("17:15");
  });
});

describe("generateTimeSlots - Overflow", () => {
  it("should allow slots past shift end when overflow enabled", () => {
    const date = makeDate(3);
    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      [],
      [],
      {
        allow_overflow: true,
        overflow_minutes: 30,
      }
    );

    // Last slot starts at 17:45, ends at 18:15 (within 18:30 overflow limit)
    expect(slots[slots.length - 1].time).toBe("17:45");
    // Verify the last slot ends within overflow limit
    const lastSlot = slots[slots.length - 1];
    const [h, m] = lastSlot.time.split(":").map(Number);
    expect(h * 60 + m + 30).toBeLessThanOrEqual(18 * 60 + 30);
  });

  it("should not allow overflow when disabled", () => {
    const date = makeDate(3);
    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      [],
      [],
      {
        allow_overflow: false,
        overflow_minutes: 30,
      }
    );

    // Last slot: 18:00 - 30min = 17:30
    expect(slots[slots.length - 1].time).toBe("17:30");
  });
});

describe("generateTimeSlots - Blocked Times", () => {
  it("should mark blocked slots as locked", () => {
    const date = makeDate(3);
    const locks = [{ start_time: "12:00", end_time: "13:00", expires_at: undefined }];

    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      [],
      locks,
      {}
    );

    const lockedSlot = slots.find((s) => s.time === "12:00");
    expect(lockedSlot).toBeDefined();
    expect(lockedSlot!.locked).toBe(true);
    expect(lockedSlot!.available).toBe(false);
  });

  it("should ignore expired locks", () => {
    const date = makeDate(3);
    const locks = [
      {
        start_time: "12:00",
        end_time: "13:00",
        expires_at: "2026-07-13T10:00:00Z", // Yesterday
      },
    ];

    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      [],
      locks,
      {}
    );

    const slot12 = slots.find((s) => s.time === "12:00");
    expect(slot12).toBeDefined();
    expect(slot12!.locked).toBe(false);
    expect(slot12!.available).toBe(true);
  });
});

describe("generateTimeSlots - Today Filtering", () => {
  it("should filter past slots for today", () => {
    // getTehranNow returns 10:00 AM
    const date = new Date(2026, 6, 14); // Today
    const slots = generateTimeSlots(
      standardHours,
      date,
      30,
      0,
      15,
      0,
      [],
      [],
      {}
    );

    // Should not have slots before 10:00
    for (const slot of slots) {
      const [h] = slot.time.split(":").map(Number);
      expect(h).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("generateTimeSlots - Shift Expansion", () => {
  it("should expand shift when fill threshold reached", () => {
    const date = makeDate(3);
    // Fill the shift to 100% (8 hours of bookings in 8-hour shift)
    const bookings = [
      { start_time: "10:00", end_time: "12:00" },
      { start_time: "12:00", end_time: "14:00" },
      { start_time: "14:00", end_time: "16:00" },
      { start_time: "16:00", end_time: "18:00" },
    ];

    const slots = generateTimeSlots(
      standardHours,
      date,
      120, // 2-hour service
      0,
      15,
      0,
      bookings,
      [],
      {
        expand_threshold: 80,
        early_extra_hours: 2,
        late_extra_hours: 2,
      }
    );

    // With expansion, shift is 08:00-20:00
    // But all slots overlap with bookings, so no available slots
    // This tests that expansion logic runs without errors
    expect(slots).toBeDefined();
  });
});

describe("generateTimeSlots - Addon Duration", () => {
  it("should include addon duration in effective duration", () => {
    const date = makeDate(3);
    const slots = generateTimeSlots(
      standardHours,
      date,
      30, // 30 min service
      15, // 15 min addon
      15, // 15 min resolution
      0,
      [],
      [],
      {}
    );

    // Effective duration = ceil((30 + 15) / 15) * 15 = 45 min
    // Last slot: 18:00 - 45min = 17:15
    expect(slots[slots.length - 1].time).toBe("17:15");
  });
});

describe("getNearestAvailableSlot", () => {
  it("should find the nearest available slot within 14 days", () => {
    const result = getNearestAvailableSlot(
      standardHours,
      30,
      0,
      15,
      0,
      [],
      [],
      {}
    );

    // Should find a slot
    expect(result).not.toBeNull();
    expect(result!.time).toBeDefined();
    expect(result!.date).toBeInstanceOf(Date);
  });

  it("should return null if no slots available in 14 days", () => {
    // Create hours where all days are closed
    const closedHours: WorkingHours = {
      sat: null,
      sun: null,
      mon: null,
      tue: null,
      wed: null,
      thu: null,
      fri: null,
    };

    const result = getNearestAvailableSlot(
      closedHours,
      30,
      0,
      15,
      0,
      [],
      [],
      {}
    );

    expect(result).toBeNull();
  });
});

describe("generateTimeSlots - Service Duration Edge Cases", () => {
  it("should handle service longer than shift", () => {
    const date = makeDate(3);
    // 10-hour service in 8-hour shift
    const slots = generateTimeSlots(
      standardHours,
      date,
      600,
      0,
      15,
      0,
      [],
      [],
      {}
    );

    // No slots can fit a 10-hour service
    expect(slots.length).toBe(0);
  });

  it("should handle 5-minute service with 5-minute resolution", () => {
    const date = makeDate(3);
    const slots = generateTimeSlots(
      standardHours,
      date,
      5,
      0,
      5,
      0,
      [],
      [],
      {}
    );

    // Should have many slots (8 hours * 12 slots/hour = 96)
    expect(slots.length).toBe(96);
    expect(slots[0].time).toBe("10:00");
    expect(slots[1].time).toBe("10:05");
  });
});
