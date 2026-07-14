import { describe, it, expect } from "vitest";
import { getTehranDateKey, getTehranNow, isTehranToday } from "./time";

describe("getTehranDateKey", () => {
  it("should return YYYY-MM-DD format in Tehran timezone", () => {
    // 2026-07-14 12:00 UTC is 2026-07-14 15:30 in Tehran
    const date = new Date("2026-07-14T12:00:00Z");
    const result = getTehranDateKey(date);
    expect(result).toBe("2026-07-14");
  });

  it("should handle date boundary correctly", () => {
    // 2026-07-14 20:00 UTC is 2026-07-14 23:30 in Tehran (same day)
    const date = new Date("2026-07-14T20:00:00Z");
    const result = getTehranDateKey(date);
    expect(result).toBe("2026-07-14");
  });

  it("should handle midnight crossover", () => {
    // 2026-07-14 20:31 UTC is 2026-07-15 00:01 in Tehran (next day)
    const date = new Date("2026-07-14T20:31:00Z");
    const result = getTehranDateKey(date);
    expect(result).toBe("2026-07-15");
  });
});

describe("getTehranNow", () => {
  it("should return dateKey and minutes", () => {
    const now = new Date("2026-07-14T12:00:00Z"); // 15:30 Tehran
    const result = getTehranNow(now);
    expect(result.dateKey).toBe("2026-07-14");
    expect(result.minutes).toBe(15 * 60 + 30); // 15:30 = 930 minutes
  });

  it("should handle midnight", () => {
    // 2026-07-14 20:30 UTC is 2026-07-15 00:00 Tehran
    const date = new Date("2026-07-14T20:30:00Z");
    const result = getTehranNow(date);
    expect(result.minutes).toBe(0);
  });

  it("should handle end of day", () => {
    // 2026-07-14 20:29 UTC is 2026-07-14 23:59 Tehran
    const date = new Date("2026-07-14T20:29:00Z");
    const result = getTehranNow(date);
    expect(result.minutes).toBe(23 * 60 + 59); // 23:59 = 1439 minutes
  });
});

describe("isTehranToday", () => {
  it("should return true for today's date in Tehran", () => {
    const now = new Date("2026-07-14T12:00:00Z");
    const today = new Date("2026-07-14T15:00:00Z"); // Same Tehran day
    expect(isTehranToday(today, now)).toBe(true);
  });

  it("should return false for different dates", () => {
    const now = new Date("2026-07-14T12:00:00Z");
    const tomorrow = new Date("2026-07-15T10:00:00Z"); // Different Tehran day
    expect(isTehranToday(tomorrow, now)).toBe(false);
  });
});
