import { describe, it, expect, vi, beforeAll } from "vitest";
import { createBooking } from "./service";
import { BookingError } from "./errors";
import type { BookingRequestInput } from "./schema";

// No database may be touched: the validation ladder under test throws before
// any query. connect() failing loudly proves the ladder passed, not that a
// transaction ran.
vi.mock("@vercel/postgres", () => ({
  sql: Object.assign(
    () => {
      throw new Error("sql template must not execute in unit tests");
    },
    {
      connect: vi.fn(async () => {
        throw new Error("DB_REACHED");
      }),
    }
  ),
}));

// Deterministic "now": 2026-08-28, 10:00 Tehran (600 minutes).
vi.mock("@/lib/time", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/time")>();
  return {
    ...actual,
    getTehranNow: () => ({ dateKey: "2026-08-28", minutes: 600 }),
  };
});

vi.mock("@/lib/anti-spam", () => ({
  checkAntiSpam: vi.fn(async () => ({ allowed: true })),
}));

// Never let a stray env value turn resolveSalonId into a real DB lookup.
beforeAll(() => {
  delete process.env.SALON_ID;
});

// A payload that passes the full validation ladder. createBooking then hits
// the (deliberately failing) DB connection, surfacing as the DB_BOUNDARY sentinel — which
// is how these tests prove "got past validation".
const futureInput: BookingRequestInput = {
  phone: "09357149901",
  service_id: "svc-1",
  date_gregorian: "2026-08-30",
  start_time: "10:00",
  end_time: "11:30",
  customer_name: "مریم رضایی",
  selected_addons: [],
};

// Sentinel for "the full validation ladder passed": createBooking reaches
// sql.connect() — which the mock fails loudly — outside its try block, so the
// raw error surfaces unwrapped.
const DB_BOUNDARY = "DB_BOUNDARY";

async function outcome(input: BookingRequestInput): Promise<string> {
  try {
    await createBooking(input, "user-1", input.phone);
    throw new Error("expected createBooking to throw");
  } catch (error) {
    if (error instanceof BookingError) return error.code;
    if (error instanceof Error && error.message === "DB_REACHED") return DB_BOUNDARY;
    throw error;
  }
}

describe("createBooking validation ladder", () => {
  it("accepts a well-formed future booking (fails later at the DB boundary)", async () => {
    expect(await outcome(futureInput)).toBe(DB_BOUNDARY);
  });

  it("rejects impossible dates as INVALID_DATE", async () => {
    expect(
      await outcome({ ...futureInput, date_gregorian: "2026-02-30" })
    ).toBe("INVALID_DATE");
    expect(
      await outcome({ ...futureInput, date_gregorian: "not-a-date" })
    ).toBe("INVALID_DATE");
  });

  it("rejects bookings that end at/after midnight as TIME_INVALID", async () => {
    expect(
      await outcome({ ...futureInput, end_time: "24:00" })
    ).toBe("TIME_INVALID");
  });

  it("rejects inverted or zero-length ranges as TIME_RANGE_INVALID", async () => {
    expect(
      await outcome({ ...futureInput, start_time: "11:00", end_time: "10:00" })
    ).toBe("TIME_RANGE_INVALID");
    expect(
      await outcome({ ...futureInput, start_time: "10:00", end_time: "10:00" })
    ).toBe("TIME_RANGE_INVALID");
  });

  it("rejects past dates as TIME_IN_PAST", async () => {
    expect(
      await outcome({ ...futureInput, date_gregorian: "2026-08-27" })
    ).toBe("TIME_IN_PAST");
  });

  it("rejects earlier-today start times as TIME_IN_PAST", async () => {
    expect(
      await outcome({
        ...futureInput,
        date_gregorian: "2026-08-28",
        start_time: "09:59",
        end_time: "10:30",
      })
    ).toBe("TIME_IN_PAST");
  });

  it("allows a start exactly at the current minute (boundary)", async () => {
    expect(
      await outcome({
        ...futureInput,
        date_gregorian: "2026-08-28",
        start_time: "10:00",
        end_time: "10:30",
      })
    ).toBe(DB_BOUNDARY);
  });

  it("handles single-digit hours numerically, not as strings", async () => {
    // "9:00"→"10:00" is a valid range and a past time (now = 10:00) — the
    // old string comparison called it TIME_RANGE_INVALID.
    expect(
      await outcome({
        ...futureInput,
        date_gregorian: "2026-08-28",
        start_time: "9:59",
        end_time: "10:30",
      })
    ).toBe("TIME_IN_PAST");
    expect(
      await outcome({
        ...futureInput,
        date_gregorian: "2026-08-30",
        start_time: "9:00",
        end_time: "10:00",
      })
    ).toBe(DB_BOUNDARY);
  });

  it("surfaces spam rejection with the server-provided message", async () => {
    const { checkAntiSpam } = await import("@/lib/anti-spam");
    vi.mocked(checkAntiSpam).mockResolvedValueOnce({
      allowed: false,
      error: "لطفاً ۳ دقیقه دیگر تلاش کنید.",
    });
    try {
      await createBooking(futureInput, "user-1", futureInput.phone);
      throw new Error("expected createBooking to throw");
    } catch (error) {
      if (!(error instanceof BookingError)) throw error;
      expect(error.code).toBe("SPAM_DETECTED");
      expect(error.message).toContain("۳ دقیقه");
    }
  });
});
