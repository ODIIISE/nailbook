"use client";

import { SalonProvider } from "@/lib/salon-context";
import { AuthProvider } from "@/lib/auth-context";
import { MenuProvider } from "@/components/layout/menu-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SalonProvider>
        <MenuProvider>{children}</MenuProvider>
      </SalonProvider>
    </AuthProvider>
  );
}
