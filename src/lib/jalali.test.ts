import { describe, it, expect } from "vitest";
import {
  toPersianDigits,
  formatPrice,
  formatJalaliDate,
  formatJalaliDateShort,
  formatJalaliTime,
  getJalaliWeekdayName,
  getJalaliWeekdayFullName,
  isJalaliLeapYear,
} from "./jalali";

describe("toPersianDigits", () => {
  it("should convert English digits to Persian", () => {
    expect(toPersianDigits("123")).toBe("۱۲۳");
    expect(toPersianDigits("0912")).toBe("۰۹۱۲");
  });

  it("should handle numbers", () => {
    expect(toPersianDigits(42)).toBe("۴۲");
  });

  it("should preserve non-digit characters", () => {
    expect(toPersianDigits("12:30")).toBe("۱۲:۳۰");
  });
});

describe("formatPrice", () => {
  it("should format price with Persian digits and separators", () => {
    expect(formatPrice(350000)).toBe("۳۵۰,۰۰۰");
    expect(formatPrice(1000000)).toBe("۱,۰۰۰,۰۰۰");
  });

  it("should handle zero", () => {
    expect(formatPrice(0)).toBe("۰");
  });
});

describe("formatJalaliDate", () => {
  it("should format date in Persian", () => {
    const result = formatJalaliDate(1405, 4, 15);
    expect(result).toContain("۱۵");
    expect(result).toContain("تیر");
    expect(result).toContain("۱۴۰۵");
  });
});

describe("formatJalaliDateShort", () => {
  it("should format short date in Persian", () => {
    const result = formatJalaliDateShort(1405, 4, 15);
    expect(result).toContain("۱۵");
    expect(result).toContain("تیر");
    expect(result).not.toContain("۱۴۰۵");
  });
});

describe("formatJalaliTime", () => {
  it("should format time with Persian digits", () => {
    expect(formatJalaliTime("12:30")).toBe("۱۲:۳۰");
    expect(formatJalaliTime("09:00")).toBe("۰۹:۰۰");
  });
});

describe("getJalaliWeekdayName", () => {
  it("should return short Persian weekday names", () => {
    // 2026-07-14 is Tuesday
    const date = new Date(2026, 6, 14);
    const name = getJalaliWeekdayName(date);
    expect(name).toBe("س"); // سه‌شنبه (Tuesday)
  });
});

describe("getJalaliWeekdayFullName", () => {
  it("should return full Persian weekday names", () => {
    const date = new Date(2026, 6, 14);
    const name = getJalaliWeekdayFullName(date);
    expect(name).toBe("سه‌شنبه");
  });
});

describe("isJalaliLeapYear", () => {
  it("should identify leap years correctly", () => {
    // These are known leap years in Jalali calendar
    expect(isJalaliLeapYear(1404)).toBe(true);
    expect(isJalaliLeapYear(1403)).toBe(false);
  });
});
