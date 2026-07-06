"use client";

import { usePathname, useRouter } from "next/navigation";
import { UilHome, UilCalendarAlt, UilUser } from "@iconscout/react-unicons";

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { path: "/", icon: UilHome, label: "خانه" },
    { path: "/bookings", icon: UilCalendarAlt, label: "نوبت‌ها" },
    { path: "/profile", icon: UilUser, label: "پروفایل" },
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
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-[10px] pb-[6px] transition-colors duration-150 ${
                active ? "text-primary" : "text-black/40"
              }`}
            >
              <Icon
                className="h-6 w-6"
                style={{ fill: active ? "currentColor" : "none" }}
              />
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
