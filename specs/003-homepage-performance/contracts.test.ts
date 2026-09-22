import { readFileSync, existsSync, statSync } from "node:fs";
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

describe("specs/003 mascot contracts", () => {
  it("homepage hero points at the glasses sheets, never the cat", () => {
    const luxHome = src("src/components/landing/lux-home.tsx");
    expect(luxHome).toContain("/mascots/glasses-directions.webp");
    expect(luxHome).toContain("/mascots/glasses-reactions.webp");
    expect(luxHome).not.toContain("/mascots/cat-directions.webp");
    expect(luxHome).not.toContain("/mascots/cat-reactions.webp");
  });

  it("glasses sheets exist, are WebP, and weigh <= 300KB each; cat sheets are gone", () => {
    for (const f of ["public/mascots/glasses-directions.webp", "public/mascots/glasses-reactions.webp"]) {
      expect(existsSync(resolve(root, f)), `${f} should exist`).toBe(true);
      const bytes = statSync(resolve(root, f)).size;
      expect(bytes, `${f} should be <= 300KB (got ${bytes}B)`).toBeLessThanOrEqual(300 * 1024);
    }
    expect(existsSync(resolve(root, "public/mascots/cat-directions.webp"))).toBe(false);
    expect(existsSync(resolve(root, "public/mascots/cat-reactions.webp"))).toBe(false);
  });

  it("no source file references the cat sheets anymore", () => {
    const luxHome = src("src/components/landing/lux-home.tsx");
    const salonBooking = src("src/components/landing/salon-booking.tsx");
    const bookingFlow = src("src/components/booking/booking-flow.tsx");
    for (const content of [luxHome, salonBooking, bookingFlow]) {
      expect(content).not.toContain("cat-directions");
      expect(content).not.toContain("cat-reactions");
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
  it("homepage is not gated behind SalonGuard; shell renders before data", () => {
    const salonBooking = src("src/components/landing/salon-booking.tsx");
    expect(salonBooking).not.toContain("SalonGuard");
    // hero renders immediately, CTAs wait for the critical payload
    expect(salonBooking).toContain("ctasEnabled");
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
