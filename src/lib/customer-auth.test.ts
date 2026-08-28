import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import {
  signCustomerSession,
  verifyCustomerSession,
} from "./customer-auth";

// HMAC helper mirroring the token format so tests can mint arbitrary
// (including legacy 3-part and out-of-window) tokens.
function hmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

const SECRET = "unit-test-secret";

beforeAll(() => {
  process.env.CUSTOMER_SESSION_SECRET = SECRET;
});

describe("customer session tokens", () => {
  it("round-trips a versioned token back to its userId", () => {
    const token = signCustomerSession("u-123", 2);
    expect(token.split(":")).toHaveLength(4);
    expect(verifyCustomerSession(token)).toBe("u-123");
  });

  it("defaults to version 0", () => {
    const token = signCustomerSession("u-123");
    expect(Number(token.split(":")[2])).toBe(0);
  });

  it("still accepts legacy 3-part tokens", () => {
    const payload = `u-legacy:${Date.now()}`;
    const legacy = `${payload}:${hmac(payload, SECRET)}`;
    expect(verifyCustomerSession(legacy)).toBe("u-legacy");
  });

  it("rejects a tampered signature", () => {
    const token = signCustomerSession("u-123");
    const parts = token.split(":");
    parts[3] = parts[3].slice(0, -2) + "00";
    expect(verifyCustomerSession(parts.join(":"))).toBeNull();
  });

  it("rejects a tampered payload (userId swap)", () => {
    const token = signCustomerSession("u-123");
    const parts = token.split(":");
    expect(verifyCustomerSession(`u-attacker:${parts[1]}:${parts[2]}:${parts[3]}`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    const payload = `u-123:${Date.now()}:0`;
    const forged = `${payload}:${hmac(payload, "attacker-secret")}`;
    expect(verifyCustomerSession(forged)).toBeNull();
  });

  it("rejects expired tokens (30-day lifetime)", () => {
    const payload = `u-123:${Date.now() - 31 * 24 * 60 * 60 * 1000}:0`;
    const expired = `${payload}:${hmac(payload, SECRET)}`;
    expect(verifyCustomerSession(expired)).toBeNull();
  });

  it("rejects timestamps too far in the future (clock-skew bound)", () => {
    const payload = `u-123:${Date.now() + 6 * 60 * 1000}:0`;
    const future = `${payload}:${hmac(payload, SECRET)}`;
    expect(verifyCustomerSession(future)).toBeNull();
  });

  it("tolerates a small future skew so fresh cross-region verifications pass", () => {
    const payload = `u-123:${Date.now() + 60 * 1000}:0`;
    const slightlyFuture = `${payload}:${hmac(payload, SECRET)}`;
    expect(verifyCustomerSession(slightlyFuture)).toBe("u-123");
  });

  it("rejects zero and negative timestamps outright", () => {
    const zero = `u-123:0:${hmac("u-123:0", SECRET)}`;
    expect(verifyCustomerSession(zero)).toBeNull();
    const negative = `u-123:-5:${hmac("u-123:-5", SECRET)}`;
    expect(verifyCustomerSession(negative)).toBeNull();
  });

  it("rejects malformed structures", () => {
    expect(verifyCustomerSession(undefined)).toBeNull();
    expect(verifyCustomerSession("")).toBeNull();
    expect(verifyCustomerSession("u-123")).toBeNull();
    expect(verifyCustomerSession("u-123:123")).toBeNull();
    expect(verifyCustomerSession("a:b:c:d:e")).toBeNull();
  });

  it("rejects non-hex signatures instead of throwing", () => {
    const payload = `u-123:${Date.now()}:0`;
    expect(verifyCustomerSession(`${payload}:not-hex-signature!!`)).toBeNull();
  });
});
