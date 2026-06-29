"use client";

import { SalonProvider } from "@/lib/salon-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SalonProvider>{children}</SalonProvider>;
}
