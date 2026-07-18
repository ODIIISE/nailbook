"use client";

import { useRouter } from "next/navigation";
import { Settings, CircleDot, Users, LogOut, History, Briefcase } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { SalonGuard } from "@/components/ui/salon-guard";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const menuItems = [
    { icon: <span className="text-[14px]">🏠</span>, label: "صفحه اصلی", onClick: () => router.push("/") },
    { icon: <Briefcase className="h-4 w-4" />, label: "خدمات", onClick: () => router.push("/owner/services") },
    { icon: <CircleDot className="h-4 w-4" />, label: "مدیریت هایلایت", onClick: () => router.push("/owner/highlights") },
    { icon: <Users className="h-4 w-4" />, label: "کاربران", onClick: () => router.push("/owner/users") },
    { icon: <Settings className="h-4 w-4" />, label: "تنظیمات سالن", onClick: () => router.push("/owner/settings") },
    {
      icon: <LogOut className="h-4 w-4" />,
      label: "خروج",
      destructive: true,
      onClick: async () => {
        await fetch("/api/owner-logout", { method: "POST" });
        router.push("/owner/login");
      },
    },
  ];

  return (
    <SalonGuard>
      <div className="min-h-screen pb-20">
        <AppHeader menuItems={menuItems} menuFooter={<></>} />
        <div className="mx-auto max-w-lg">
          {children}
        </div>
        <AppNavbar />
      </div>
    </SalonGuard>
  );
}
