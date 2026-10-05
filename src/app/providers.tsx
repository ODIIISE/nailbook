"use client";

import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import { SalonProvider } from "@/lib/salon-context";
import { AuthProvider } from "@/lib/auth-context";
import { MenuProvider } from "@/components/layout/menu-context";
import { MenuSheet } from "@/components/layout/menu-sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { faOverrides } from "@/i18n/fa";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    /* One locale for the whole app: stock Astryx components resolve their own
       strings against this context (Persian via faOverrides) and mirror layout
       from the DOM `dir="rtl"` that layout.tsx already sets. */
    <InternationalizationProvider locale="fa" overrides={faOverrides}>
      <TooltipProvider>
        <AuthProvider>
          <SalonProvider>
            {/* ONE menu instance for the whole app: AppHeader, AppNavbar and the
                editorial homepage all call openMenu() on the same context. */}
            <MenuProvider>
              {children}
              <MenuSheet />
            </MenuProvider>
          </SalonProvider>
        </AuthProvider>
      </TooltipProvider>
    </InternationalizationProvider>
  );
}
