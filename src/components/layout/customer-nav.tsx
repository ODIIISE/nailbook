"use client";

import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, CalendarDaysIcon, UserIcon } from "@heroicons/react/24/outline";

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { path: "/", icon: HomeIcon, label: "خانه" },
    { path: "/bookings", icon: CalendarDaysIcon, label: "نوبت‌ها" },
    { path: "/profile", icon: UserIcon, label: "پروفایل" },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto max-w-lg flex items-stretch">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-[10px] pb-[6px] transition-opacity duration-150 ${
                active ? "opacity-100 text-primary" : "opacity-70 text-black"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-normal"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
