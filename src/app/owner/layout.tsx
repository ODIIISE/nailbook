"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { SalonGuard } from "@/components/ui/salon-guard";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/owner/login";

  return (
    <SalonGuard>
      <div className="min-h-screen pb-20">
        <AppHeader />
        <div className="mx-auto max-w-lg">
          {children}
        </div>
        {!isLoginPage && <AppNavbar />}
      </div>
    </SalonGuard>
  );
}
