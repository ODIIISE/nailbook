"use client";

import { useSalon } from "@/lib/salon-context";

interface SalonGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SalonGuard({ children, fallback }: SalonGuardProps) {
  const { loaded } = useSalon();

  if (!loaded) {
    return fallback ?? (
      <div className="px-4 py-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted/30 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return <>{children}</>;
}
