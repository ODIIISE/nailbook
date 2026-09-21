"use client";

import { AppNavbar } from "@/components/layout/app-navbar";

/**
 * Shared customer chrome: bottom clearance + the customer bottom navbar
 * (خانه / نوبت‌ها / پروفایل / منو). Rendered by the (main) route group in
 * salon mode; AppNavbar itself picks the customer item set for any
 * non-/owner path. Primary navigation lives here — the hamburger menu must
 * not repeat these destinations.
 */
export function MainChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      {children}
      <AppNavbar />
    </div>
  );
}
