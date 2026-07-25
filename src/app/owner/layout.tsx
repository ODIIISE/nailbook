"use client";

import { useRouter, usePathname } from "next/navigation";
import { Settings, CircleDot, Users, LogOut, Briefcase, Home } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { SalonGuard } from "@/components/ui/salon-guard";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/owner/login";

  const menuItems = [
    { icon: <Home className="h-4 w-4" />, label: "صفحه اصلی", onClick: () => router.push("/") },
    ...(!isLoginPage ? [
      { icon: <Briefcase className="h-4 w-4" />, label: "خدمات", onClick: () => router.push("/owner/services") },
      { icon: <CircleDot className="h-4 w-4" />, label: "مدیریت هایلایت", onClick: () => router.push("/owner/highlights") },
      { icon: <Users className="h-4 w-4" />, label: "کاربران", onClick: () => router.push("/owner/users") },
      { icon: <Settings className="h-4 w-4" />, label: "تنظیمات سالن", onClick: () => router.push("/owner/settings") },
      {
        icon: <LogOut className="h-4 w-4" />,
        label: "خروج",
        destructive: true,
        onClick: async () => {
          await fetch("/api/owner-logout", { method: "POST", credentials: "include" });
          window.location.href = "/owner/login";
        },
      },
    ] : []),
  ];

  return (
    <SalonGuard>
      <div className="min-h-screen pb-20">
        <AppHeader menuItems={menuItems} menuFooter={<></>} />
        <div className="mx-auto max-w-lg">
          {children}
        </div>
        {!isLoginPage && <AppNavbar />}
      </div>
    </SalonGuard>
  );
}
