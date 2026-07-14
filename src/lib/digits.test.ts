import { describe, it, expect } from "vitest";
import { normalizeDigits, displayDigits, isValidIranianPhone } from "./digits";

describe("normalizeDigits", () => {
  it("should convert Persian digits to English", () => {
    expect(normalizeDigits("۰۹۱۲")).toBe("0912");
    expect(normalizeDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
  });

  it("should strip non-digit characters", () => {
    expect(normalizeDigits("۰۹۱۲-۱۲۳-۴۵۶۷")).toBe("09121234567");
    expect(normalizeDigits("0912 123 4567")).toBe("09121234567");
  });

  it("should handle mixed Persian and English digits", () => {
    expect(normalizeDigits("۰۹۱۲abcd۳۴۵۶")).toBe("09123456");
  });

  it("should handle empty string", () => {
    expect(normalizeDigits("")).toBe("");
  });
});

describe("displayDigits", () => {
  it("should convert English digits to Persian", () => {
    expect(displayDigits("0912")).toBe("۰۹۱۲");
    expect(displayDigits("1234567890")).toBe("۱۲۳۴۵۶۷۸۹۰");
  });

  it("should preserve non-digit characters", () => {
    expect(displayDigits("0912-123-4567")).toBe("۰۹۱۲-۱۲۳-۴۵۶۷");
  });

  it("should handle empty string", () => {
    expect(displayDigits("")).toBe("");
  });
});

describe("isValidIranianPhone", () => {
  it("should accept valid Iranian mobile numbers", () => {
    expect(isValidIranianPhone("09121234567")).toBe(true);
    expect(isValidIranianPhone("09351234567")).toBe(true);
    expect(isValidIranianPhone("09011234567")).toBe(true);
  });

  it("should accept Persian digit input", () => {
    expect(isValidIranianPhone("۰۹۱۲۱۲۳۴۵۶۷")).toBe(true);
  });

  it("should reject invalid formats", () => {
    expect(isValidIranianPhone("1234567")).toBe(false); // Too short
    expect(isValidIranianPhone("091212345678")).toBe(false); // Too long
    expect(isValidIranianPhone("08121234567")).toBe(false); // Wrong prefix
    expect(isValidIranianPhone("abcdefghijk")).toBe(false); // Not digits
  });

  it("should reject empty or null", () => {
    expect(isValidIranianPhone("")).toBe(false);
  });
});
