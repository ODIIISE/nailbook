import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Two-tier navigation contract (specs/001-two-tier-navigation):
 * primary destinations live in the bottom navbar; the hamburger menu carries
 * only secondary content. These are source-contract tests — the suite runs in
 * a plain Node environment (no DOM), so they assert on component source
 * rather than rendering. That still guards the invariant: any reintroduced
 * navbar-covered link fails CI with a pointed message.
 */

const menuSource = readFileSync(
  new URL("./hamburger-menu.tsx", import.meta.url),
  "utf-8",
);

function slice(startMarker: string, endMarker: string): string {
  const start = menuSource.indexOf(startMarker);
  const end = menuSource.indexOf(endMarker);
  expect(start, `marker not found: ${startMarker}`).toBeGreaterThan(-1);
  expect(end, `marker not found: ${endMarker}`).toBeGreaterThan(start);
  return menuSource.slice(start, end);
}

describe("two-tier navigation: hamburger must not duplicate the navbar", () => {
  it("owner menu never repeats navbar destinations (/owner, /owner/schedule, /owner/activity)", () => {
    const body = slice("function OwnerContent", "export function HamburgerMenu");
    // The owner navbar covers /owner (exact), /owner/schedule and
    // /owner/activity. MenuLink matching is prefix-based, so /owner must not
    // appear as a menu href at all — otherwise the item would light up on
    // every owner page.
    expect(body).not.toContain('MenuLink href="/owner"');
    expect(body).not.toContain('href="/owner/schedule"');
    expect(body).not.toContain('href="/owner/activity"');
  });

  it("owner menu keeps secondary management surfaces reachable", () => {
    const body = slice("function OwnerContent", "export function HamburgerMenu");
    expect(body).toContain('href="/owner/services"');
    expect(body).toContain('href="/owner/users"');
    expect(body).toContain('href="/owner/highlights"');
    expect(body).toContain('href="/owner/settings"');
    expect(body).toContain('href="/"'); // مشاهده سایت مشتری
  });

  it("customer menu body never repeats navbar destinations (/, /bookings, /profile)", () => {
    // Guest + customer menu content: account card, portfolio, salon info.
    // The account card may offer login (not a navbar destination) but must
    // not offer خانه/نوبت‌ها/پروفایل links.
    const guest = slice("function GuestContent", "function CustomerContent");
    const accountCard = slice("function AccountCard", "function OwnerAccountCard");
    for (const body of [guest, accountCard]) {
      expect(body).not.toContain('href="/"');
      expect(body).not.toContain('href="/bookings"');
      expect(body).not.toContain('href="/profile"');
    }
  });

  it("customer menu keeps login + portfolio reachable", () => {
    const guest = slice("function GuestContent", "function CustomerContent");
    const accountCard = slice("function AccountCard", "function OwnerAccountCard");
    expect(guest).toContain('href="/portfolio"');
    expect(accountCard).toContain('href="/login"');
  });
});
