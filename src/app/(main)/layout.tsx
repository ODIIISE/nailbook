import { isSalonMode } from "@/lib/multi-tenant";
import { MainChrome } from "@/components/layout/main-chrome";

/**
 * Customer-side route group. Gives the salon/customer surfaces the same
 * two-tier navigation as the owner panel: primary destinations live in the
 * bottom navbar, secondary content in the hamburger — so the hamburger never
 * duplicates navbar items (specs/001-two-tier-navigation).
 *
 * Admin (platform) mode has no customer app chrome: the landing keeps its
 * own single-screen layout without a bottom navbar. The decision is made on
 * the server from SALON_ID (same source of truth as the homepage mode split).
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  if (!isSalonMode()) {
    return <>{children}</>;
  }
  return <MainChrome>{children}</MainChrome>;
}
