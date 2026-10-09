"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { can, isStaff, type StaffPermission } from "@/lib/staff-permissions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";

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
          <Skeleton className="h-48 w-full rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Permission gate for owner surfaces. Staff lacking the permission see an
 * explicit denied card instead of firing requests that 403 (previously
 * misreported as an expired session, logging them out).
 *
 * Non-staff visitors render children untouched: logged-out and customer
 * flows (login redirect, return-to stash, draft preservation) stay exactly
 * as they were.
 */
export function StaffGate({
  permission,
  children,
}: {
  permission: StaffPermission | null;
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (permission === null) return <>{children}</>;
  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-24 w-full rounded-none" />
        <Skeleton className="h-48 w-full rounded-none" />
      </div>
    );
  }
  if (user && isStaff(user.roles) && !can(user.roles, permission)) {
    return (
      <div className="p-4">
        <div className="rounded-none border border-border p-8 flex flex-col items-center gap-3 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-body font-normal">دسترسی ندارید</p>
          <p className="text-small text-muted-foreground">این بخش برای نقش شما مجاز نیست.</p>
          <Button variant="outline" size="sm" className="mt-1 rounded-full" onClick={() => router.push("/owner")}>
            بازگشت به زمان‌بندی
          </Button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
