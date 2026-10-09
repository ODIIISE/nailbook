import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPTIMIZER_SETTINGS,
  isValidSpecificDaysOff,
  isValidWorkingHours,
  normalizeDaysOffReasons,
  normalizeOptimizerSettings,
} from "./salon-settings";

describe("salon optimizer settings", () => {
  it("uses safe defaults when database values are missing", () => {
    expect(normalizeOptimizerSettings({})).toEqual(DEFAULT_OPTIMIZER_SETTINGS);
  });

  it("normalizes persisted numeric values to the supported bounds", () => {
    expect(normalizeOptimizerSettings({
      optimization_mode: "legacy",
      suggestion_limit: 99,
      min_useful_gap_minutes: -10,
    })).toEqual({
      optimization_mode: "legacy",
      suggestion_limit: 10,
      min_useful_gap_minutes: 0,
    });
  });

  it("falls back to hybrid for unknown modes and truncates decimals", () => {
    expect(normalizeOptimizerSettings({
      optimization_mode: "unknown",
      suggestion_limit: 2.9,
      min_useful_gap_minutes: 45.8,
    })).toEqual({
      optimization_mode: "hybrid",
      suggestion_limit: 2,
      min_useful_gap_minutes: 45,
    });
  });
});

describe("owner schedule payload validation", () => {
  it("accepts valid hours and ISO date days off", () => {
    expect(isValidWorkingHours({ sat: { open: "09:00", close: "18:00" }, fri: null })).toBe(true);
    expect(isValidSpecificDaysOff(["2026-08-05", "2026-12-31"])).toBe(true);
  });

  it("rejects malformed hours, reversed shifts, invalid day keys, and impossible dates", () => {
    expect(isValidWorkingHours({ sat: { open: "9:00", close: "18:00" } })).toBe(false);
    expect(isValidWorkingHours({ sat: { open: "18:00", close: "09:00" } })).toBe(false);
    expect(isValidWorkingHours({ saturday: { open: "09:00", close: "18:00" } })).toBe(false);
    expect(isValidSpecificDaysOff(["2026/08/05"])).toBe(false);
    expect(isValidSpecificDaysOff(["2026-02-30"])).toBe(false);
  });

  it("accepts in-hours breaks and rejects out-of-hours or overlapping breaks", () => {
    expect(isValidWorkingHours({ sat: { open: "09:00", close: "18:00", breaks: [{ start: "13:00", end: "14:00" }] } })).toBe(true);
    expect(isValidWorkingHours({ sat: { open: "09:00", close: "18:00" } })).toBe(true);
    expect(isValidWorkingHours({ sat: { open: "09:00", close: "18:00", breaks: [{ start: "08:00", end: "09:30" }] } })).toBe(false);
    expect(isValidWorkingHours({ sat: { open: "09:00", close: "18:00", breaks: [{ start: "14:00", end: "13:00" }] } })).toBe(false);
    expect(isValidWorkingHours({ sat: { open: "09:00", close: "18:00", breaks: [{ start: "13:00", end: "14:00" }, { start: "13:30", end: "14:30" }] } })).toBe(false);
    expect(isValidWorkingHours({ sat: { open: "09:00", close: "18:00", breaks: "lunch" } })).toBe(false);
  });

  it("keeps valid days-off reasons and drops malformed entries", () => {
    expect(normalizeDaysOffReasons(undefined)).toEqual({});
    expect(normalizeDaysOffReasons([])).toEqual({});
    expect(normalizeDaysOffReasons({
      "2026-08-05": "تعطیلات تابستانی",
      "not-a-date": "x",
      "2026-08-06": 42,
      "2026-08-07": "   ",
    })).toEqual({ "2026-08-05": "تعطیلات تابستانی" });
    expect(normalizeDaysOffReasons({ "2026-08-05": "a".repeat(200) })).toEqual({
      "2026-08-05": "a".repeat(100),
    });
  });
});
