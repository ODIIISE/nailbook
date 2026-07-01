"use client";

import { SalonProvider } from "@/lib/salon-context";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SalonProvider>{children}</SalonProvider>
    </AuthProvider>
  );
}
