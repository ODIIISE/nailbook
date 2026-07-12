"use client";

import { useSalon } from "@/lib/salon-context";

interface SalonGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SalonGuard({ children }: SalonGuardProps) {
  const { loaded } = useSalon();

  if (!loaded) return null;

  return <>{children}</>;
}
