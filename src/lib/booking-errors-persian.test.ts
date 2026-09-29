/**
 * Edge-state guards for the booking flow (AUDIT-010).
 *
 * P2 one source of truth: the frontend classifies server conflicts by the
 * Persian message text (booking/errors.ts messages are the contract), so the
 * client-side matchers must cover every server message — a code that stops
 * matching silently degrades to the generic failure instead of the recovery
 * bounce. These tests parse the live source files, so any drift breaks here.
 *
 * P5 + P4: a network failure mid-booking must (a) stay retryable and
 * (b) never leak non-Persian text into the UI — enforced by the persianizeError
 * sanitizer in salon-context.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const readSource = (p: string) => readFileSync(resolve(__dirname, p), "utf8");

const bookingFlow = readSource("../components/booking/booking-flow.tsx");
const salonContext = readSource("./salon-context.tsx");
const authContext = readSource("./auth-context.tsx");
const errorsTs = readSource("./booking/errors.ts");

/**
 * P2 contract: the client classifies conflicts by matching a Persian FRAGMENT
 * of each server message (booking/errors.ts). Each pair must satisfy
 * server.includes(clientFragment) — if the server rewords a message so the
 * fragment stops matching, the sold-out race silently degrades to the generic
 * failure and the user keeps a dead slot selection.
 */
const SERVER_CONFLICT_MESSAGES = [
  { code: "TIME_IN_PAST", server: "این زمان گذشته است. لطفاً زمان دیگری انتخاب کنید", client: "گذشته است" },
  { code: "TIME_OUTSIDE_WORKING_HOURS", server: "ساعت رزرو خارج از ساعات کاری است", client: "خارج از ساعات کاری" },
  { code: "DAY_OFF", server: "این روز تعطیل است", client: "تعطیل است" },
  { code: "SLOT_BLOCKED", server: "این زمان مسدود شده", client: "مسدود شده" },
  { code: "SLOT_TAKEN", server: "این زمان قبلاً رزرو شده", client: "قبلاً رزرو شده" },
] as const;

describe("booking flow: server conflict coverage (P2)", () => {
  it("classifies every server conflict message via a fragment that still matches (P2)", () => {
    const flow = bookingFlow.replace(/\s+/g, " ");
    for (const { code, server, client } of SERVER_CONFLICT_MESSAGES) {
      expect(flow.includes(client), `flow must match fragment of ${code}: ${client}`).toBe(true);
      expect(errorsTs.includes(server), `errors.ts must define ${code}: ${server}`).toBe(true);
      expect(server.includes(client), `${code}: client fragment must stay a substring of the server message`).toBe(true);
    }
    // The submit-guard race variant (optimistic double-book) is also routed
    // into the conflict recovery path.
    expect(flow.includes("همین الان رزرو شد")).toBe(true);
  });

  it("bounces conflicts to the time step with the message visible there (sold-out race recovery)", () => {
    // The recovery message was historically rendered only inside ReviewStep
    // while the user was bounced to the time step — a silent bounce.
    expect(bookingFlow).toMatch(/const conflictMessage = step === "time" \? spamError : "";/);
    expect(bookingFlow).toMatch(/<TimeStep\s*\n\s*conflictMessage=\{conflictMessage\}/);
    // The banner must be announced to assistive tech (P5/P6).
    expect(bookingFlow).toMatch(/role="alert"[\s\S]{0,600}\{conflictMessage\}/);
  });

  it("passes off/fully-booked days to the month modal so it agrees with the day strip", () => {
    expect(bookingFlow).toMatch(/disabledDateKeys/);
    expect(bookingFlow).toMatch(/isOff \|\| d\.isFullyBooked/);
  });
});

describe("booking flow: network failure sanitization (P4)", () => {
  it("salon-context gates raw error text through the shared Persian sanitizer", () => {
    expect(salonContext).toMatch(/import \{ persianizeError \} from "@\/lib\/error-sanitize"/);
    expect(salonContext).toMatch(/persianizeError\(e, "خطا در ذخیره رزرو — لطفاً دوباره تلاش کنید"\)/);
    // No raw e.message propagation may remain on either booking path.
    expect(salonContext).not.toMatch(/error: message\}/);
  });

  it("sanitizer regex correctly detects Persian vs foreign error text", () => {
    const persianPattern = /[\u0600-\u06FF]/;
    expect(persianPattern.test("این زمان قبلاً رزرو شده")).toBe(true);
    expect(persianPattern.test("Failed to fetch")).toBe(false);
    expect(persianPattern.test("Internal Server Error")).toBe(false);
    expect(persianPattern.test("خطای سرور")).toBe(true);
  });

  it("every customer write surfaces a Persian fallback, never raw e.message", () => {
    // The customer booking + cancel paths are the audited surfaces; assert
    // their failure branches route through the sanitizer.
    const addBookingBlock = salonContext.slice(
      salonContext.indexOf("handleAddBooking = useCallback"),
      salonContext.indexOf("handleCancelBooking = useCallback"),
    );
    expect(addBookingBlock).toMatch(/persianizeError/);
    expect(addBookingBlock).not.toMatch(/e\.message/);
    const cancelBlock = salonContext.slice(
      salonContext.indexOf("handleCancelBooking = useCallback"),
      salonContext.indexOf("const refreshBookings = useCallback"),
    );
    expect(cancelBlock).toMatch(/persianizeError/);
  });
});

describe("booking errors contract (server ↔ client)", () => {
  it("every conflict error stays a 409 with conflict: true", () => {
    for (const { code } of SERVER_CONFLICT_MESSAGES) {
      const line = errorsTs.split("\n").find((l) => l.includes(`${code}:`));
      expect(line, `${code} definition`).toBeTruthy();
      expect(line).toContain("409");
      expect(line).toContain("conflict: true");
    }
  });
});

describe("auth-context offline copy (P5)", () => {
  it("OTP network failures name the connection, not the server", () => {
    expect(authContext).toMatch(/اتصال اینترنت را بررسی کنید/);
    // The old catch-all blamed the server for offline phones.
    const sendOtpBlock = authContext.slice(
      authContext.indexOf("sendOtp = useCallback"),
      authContext.indexOf("verifyOtp = useCallback"),
    );
    expect(sendOtpBlock).not.toMatch(/catch \{\s*\n\s*return \{ success: false, error: "خطای سرور" \};/);
  });
});

describe("salon-context bootstrap failure surface (P5)", () => {
  it("bootstrap path sets loadFailed when critical payloads are missing", () => {
    expect(salonContext).toMatch(/bootstrap\.salon === null \|\| bootstrap\.services === null/);
    expect(salonContext).toMatch(/setLoadFailed\(true\)/);
  });
});

describe("owner/admin surfaces: no raw error text reaches UI (P4, AUDIT-011)", () => {
  it("salon-context is the single sanitizer definition site (P2)", () => {
    const sanitizeLib = readSource("./error-sanitize.ts");
    expect(sanitizeLib).toMatch(/export function persianizeError/);
    // salon-context imports the shared sanitizer instead of defining its own.
    expect(salonContext).toMatch(/import \{ persianizeError \} from "@\/lib\/error-sanitize"/);
    // No raw e.message may reach a returned error or toast from salon-context.
    expect(salonContext).not.toMatch(/e instanceof Error \? e\.message/);
    expect(salonContext).not.toMatch(/error instanceof Error \? error\.message/);
  });

  it("data.ts throws Persian fallbacks on every owner write path", () => {
    const dataTs = readSource("./db/data.ts");
    expect(dataTs).not.toMatch(/throw new Error\("Failed to/);
    expect(dataTs).not.toMatch(/\|\| "Failed to/);
    expect(dataTs).not.toMatch(/\? body\.error : "Failed to/);
    for (const fallback of ["لغو نوبت انجام نشد", "خطا در ذخیره ساعات کاری", "ذخیره هایلایت انجام نشد", "حذف هایلایت انجام نشد", "ذخیره تصویر هایلایت انجام نشد", "حذف تصویر هایلایت انجام نشد", "ثبت رزرو دستی انجام نشد"]) {
      expect(dataTs.includes(fallback), `data.ts must define Persian fallback: ${fallback}`).toBe(true);
    }
  });

  it("owner schedule save sanitizes before toasting", () => {
    const schedulePage = readSource("../app/owner/schedule/page.tsx");
    expect(schedulePage).toMatch(/persianizeError\(error, "خطا در ذخیره ساعات کاری"\)/);
    expect(schedulePage).not.toMatch(/error instanceof Error \? error\.message/);
  });

  it("service-manager upload toast sanitizes before toasting", () => {
    const serviceManager = readSource("../components/owner/service-manager.tsx");
    expect(serviceManager).toMatch(/persianizeError\(error, "خطا در آپلود تصویر"\)/);
    expect(serviceManager).not.toMatch(/error instanceof Error && error\.message \? error\.message/);
  });

  it("customer cancel toasts never render raw error text", () => {
    for (const page of ["../app/(main)/bookings/page.tsx", "../app/(main)/profile/page.tsx"]) {
      const source = readSource(page);
      expect(source, `${page} must not toast raw error.message`).not.toMatch(
        /toast\.error\(error instanceof Error \? error\.message/,
      );
    }
  });
});
