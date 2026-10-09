import { describe, expect, it } from "vitest";
import { hashPin, isValidSuperAdminPassword, verifyPin } from "./super-admin-auth";

describe("super-admin password policy", () => {
  it("requires 8-128 chars after trimming", () => {
    expect(isValidSuperAdminPassword("short7")).toBe(false);
    expect(isValidSuperAdminPassword("        ")).toBe(false);
    expect(isValidSuperAdminPassword("Mehrdad7149901")).toBe(true);
    expect(isValidSuperAdminPassword("  Mehrdad7149901  ")).toBe(true);
    expect(isValidSuperAdminPassword("a".repeat(129))).toBe(false);
    expect(isValidSuperAdminPassword(12345678)).toBe(false);
    expect(isValidSuperAdminPassword(undefined)).toBe(false);
  });
});

describe("super-admin PIN hashing", () => {
  it("round-trips through hash and verify", () => {
    const stored = hashPin("Mehrdad7149901");
    expect(verifyPin("Mehrdad7149901", stored)).toBe(true);
    expect(verifyPin("wrong-password", stored)).toBe(false);
    expect(verifyPin("", stored)).toBe(false);
  });

  it("rejects malformed stored values", () => {
    expect(verifyPin("x", "")).toBe(false);
    expect(verifyPin("x", "not-a-hash")).toBe(false);
  });
});
