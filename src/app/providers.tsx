"use client";

import { SalonProvider } from "@/lib/salon-context";
import { AuthProvider } from "@/lib/auth-context";
import { MenuProvider } from "@/components/layout/menu-context";
import { HamburgerMenu } from "@/components/layout/hamburger-menu";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <SalonProvider>
          {/* ONE menu instance for the whole app: AppHeader, AppNavbar and the
              editorial homepage all call openMenu() on the same context. */}
          <MenuProvider>
            {children}
            <HamburgerMenu />
          </MenuProvider>
        </SalonProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
