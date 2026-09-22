import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolve } from "node:path";

/**
 * Source-contract regression tests for specs/003 (homepage performance +
 * mascot swap). The suite runs in a plain Node environment (no DOM), so these
 * assert on the shipped source/artifacts themselves — the invariants the
 * user asked to regress:
 *  1. Homepage shows the Glasses mascot, cat sheets are gone.
 *  2. The booking flow has NO mascot (user decision).
 *  3. The consolidated bootstrap endpoint exists and caches public data.
 *  4. The client load path adopts partial results (allSettled semantics).
 */

const root = process.cwd();
const src = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("specs/003 mascot contracts (reverted to slideshow)", () => {
  it("homepage hero is the original slideshow again — no mascot references", () => {
    const luxHome = src("src/components/landing/lux-home.tsx");
    expect(luxHome).toContain("goToSlide");
    expect(luxHome).not.toMatch(/TouchMascot|touch-mascot|mascots\//i);
  });

  it("mascot artifacts are fully removed", () => {
    expect(existsSync(resolve(root, "public/mascots"))).toBe(false);
    expect(existsSync(resolve(root, "src/components/landing/touch-mascot.tsx"))).toBe(false);
  });

  it("no source file references mascots anymore", () => {
    const salonBooking = src("src/components/landing/salon-booking.tsx");
    const bookingFlow = src("src/components/booking/booking-flow.tsx");
    for (const content of [src("src/components/landing/lux-home.tsx"), salonBooking, bookingFlow]) {
      expect(content).not.toContain("mascots/");
    }
  });
});

describe("specs/003 booking-flow contract", () => {
  it("the booking flow renders no mascot anywhere", () => {
    const bookingFlow = src("src/components/booking/booking-flow.tsx");
    expect(bookingFlow).not.toMatch(/TouchMascot|touch-mascot|Mascot/i);
    // success step still exists and is data-driven
    expect(bookingFlow).toContain("booking_success_title");
  });
});

describe("specs/003 dependency hygiene", () => {
  it("page-mascot npm dependency is removed (vendored component only)", () => {
    const pkg = JSON.parse(src("package.json")) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies?.["page-mascot"]).toBeUndefined();
  });
});

describe("specs/003 homepage shell contract", () => {
  it("homepage is not gated behind a full-page skeleton; SSR fix kept", () => {
    const salonBooking = src("src/components/landing/salon-booking.tsx");
    expect(salonBooking).not.toContain("SalonGuard");
    // the useSearchParams Suspense isolation (hero server-renders) stays
    expect(salonBooking).toContain("Suspense");
    expect(salonBooking).toContain("WelcomeToast");
  });

  it("bootstrap endpoint exists and caches public scope only", () => {
    const route = src("src/app/api/read/bootstrap/route.ts");
    expect(route).toContain('scope === "home"');
    expect(route).toContain("s-maxage=60");
    expect(route).toContain("stale-while-revalidate=300");
    expect(route).toContain("no-store");
  });

  it("context load adopts partial results and drops the all-or-nothing race", () => {
    const ctx = src("src/lib/salon-context.tsx");
    expect(ctx).toContain("fetchBootstrap");
    expect(ctx).toContain("Promise.allSettled");
    // the 12s race timer that discarded successful data and fired false toasts
    expect(ctx).not.toContain("timeout(12000)");
    // toast only on critical failure, guarded by the critical-payload check
    expect(ctx).toMatch(/criticalFailure[\s\S]{0,400}toast\.error/);
  });
});
