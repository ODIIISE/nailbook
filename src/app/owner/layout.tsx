"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { SalonGuard, StaffGate } from "@/components/ui/salon-guard";
import type { StaffPermission } from "@/lib/staff-permissions";

/** Path → the permission its surface needs. Unknown paths fall through to
 *  bookings.manage (every staff role has it; unknown routes 404 anyway). */
function permissionForPath(pathname: string): StaffPermission | null {
  if (pathname === "/owner/login") return null;
  if (pathname === "/owner/users") return "users.manage";
  if (pathname === "/owner/settings") return "settings.edit";
  if (pathname === "/owner/services" || pathname === "/owner/highlights") return "services.edit";
  if (pathname === "/owner/schedule") return "schedule.edit";
  if (pathname === "/owner/activity") return "logs.view";
  return "bookings.manage";
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/owner/login";

  return (
    <SalonGuard>
      <div className="min-h-screen pb-20">
        <AppHeader />
        <div className="mx-auto max-w-lg">
          <StaffGate permission={permissionForPath(pathname)}>{children}</StaffGate>
        </div>
        {!isLoginPage && <AppNavbar />}
      </div>
    </SalonGuard>
  );
}
