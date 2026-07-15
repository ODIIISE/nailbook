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
      <div className="min-h-screen bg-background">
        <div className="h-16 w-full skeleton" />
        <div className="p-4 space-y-4">
          <div className="h-48 w-full skeleton rounded-2xl" />
          <div className="h-24 w-full skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
