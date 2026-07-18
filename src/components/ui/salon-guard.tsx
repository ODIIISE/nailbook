"use client";

import { useSalon } from "@/lib/salon-context";
import { Skeleton } from "@/components/ui/skeleton";

interface SalonGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SalonGuard({ children, fallback }: SalonGuardProps) {
  const { loaded } = useSalon();

  if (!loaded) {
    return fallback ?? (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-16 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
