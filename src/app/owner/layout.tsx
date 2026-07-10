"use client";

import { useRouter } from "next/navigation";
import { Settings, Clock, CircleDot, Users, LogOut } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { SalonGuard } from "@/components/ui/salon-guard";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const menuItems = [
    { icon: <span className="text-[14px]">🏠</span>, label: "صفحه اصلی", onClick: () => router.push("/") },
    { icon: <Clock className="h-4 w-4" />, label: "ساعات کاری", onClick: () => router.push("/owner/schedule") },
    { icon: <CircleDot className="h-4 w-4" />, label: "مدیریت هایلایت", onClick: () => router.push("/owner/highlights") },
    { icon: <Users className="h-4 w-4" />, label: "کاربران", onClick: () => router.push("/owner/users") },
    { icon: <Settings className="h-4 w-4" />, label: "تنظیمات سالن", onClick: () => router.push("/owner/settings") },
    {
      icon: <LogOut className="h-4 w-4" />,
      label: "خروج",
      destructive: true,
      onClick: () => {
        document.cookie = "owner_session=; path=/owner; max-age=0";
        router.push("/owner/login");
      },
    },
  ];

  return (
    <SalonGuard>
      <div className="min-h-screen pb-20">
        <AppHeader menuItems={menuItems} />
        <div className="mx-auto max-w-lg">
          {children}
        </div>
        <AppNavbar />
      </div>
    </SalonGuard>
  );
}
