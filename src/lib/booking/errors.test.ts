import { describe, it, expect } from "vitest";
import { createBookingError } from "./errors";
import type { BookingErrorCode } from "./errors";

// Every failure mode a client can receive must keep its documented HTTP
// status and conflict flag — the frontend branches on `conflict` to decide
// whether to refresh availability.
const EXPECTED: Array<[BookingErrorCode, number, boolean]> = [
  ["UNAUTHORIZED", 401, false],
  ["INVALID_PHONE", 400, false],
  ["INVALID_DATE", 400, false],
  ["MISSING_FIELDS", 400, false],
  ["TIME_INVALID", 400, false],
  ["TIME_RANGE_INVALID", 400, false],
  ["TIME_IN_PAST", 409, true],
  ["TIME_OUTSIDE_WORKING_HOURS", 409, true],
  ["DAY_OFF", 409, true],
  ["SPAM_DETECTED", 429, false],
  ["SERVICE_NOT_FOUND", 400, false],
  ["INVALID_ADDONS", 400, false],
  ["DURATION_MISMATCH", 400, false],
  ["SLOT_BLOCKED", 409, true],
  ["SLOT_TAKEN", 409, true],
  ["SERVER_ERROR", 500, false],
];

describe("createBookingError payload contract", () => {
  it.each(EXPECTED)("%s → status %i, conflict %s", (code, status, conflict) => {
    const error = createBookingError(code);
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
    expect(error.conflict ?? false).toBe(conflict);
  });

  it("always carries a non-empty Persian message except SPAM_DETECTED's override slot", () => {
    for (const [code] of EXPECTED) {
      const error = createBookingError(code);
      if (code === "SPAM_DETECTED") {
        expect(error.message).toBe(""); // filled from the anti-spam result
      } else {
        expect(error.message.length).toBeGreaterThan(0);
      }
    }
  });

  it("allows a message override (SPAM_DETECTED) without touching status", () => {
    const error = createBookingError("SPAM_DETECTED", "لطفاً ۳ دقیقه دیگر تلاش کنید.");
    expect(error.message).toContain("۳ دقیقه");
    expect(error.status).toBe(429);
  });

  it("serializes to the client JSON shape", () => {
    expect(createBookingError("SLOT_TAKEN").toJSON()).toEqual({
      code: "SLOT_TAKEN",
      error: "این زمان قبلاً رزرو شده",
      conflict: true,
    });
  });
});
