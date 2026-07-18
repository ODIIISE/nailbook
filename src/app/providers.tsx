"use client";

import { SalonProvider } from "@/lib/salon-context";
import { AuthProvider } from "@/lib/auth-context";
import { MenuProvider } from "@/components/layout/menu-context";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <SalonProvider>
          <MenuProvider>{children}</MenuProvider>
        </SalonProvider>
      </AuthProvider>
    </TooltipProvider>
  );
}
