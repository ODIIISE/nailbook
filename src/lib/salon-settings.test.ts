import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPTIMIZER_SETTINGS,
  isValidSpecificDaysOff,
  isValidWorkingHours,
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
});
