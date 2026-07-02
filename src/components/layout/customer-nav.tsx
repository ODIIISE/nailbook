"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Scissors, CalendarCheck, User } from "lucide-react";

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto max-w-lg flex items-stretch border-t border-black/[0.08]">
        {[
          { path: "/", icon: Home, label: "خانه" },
          { path: "/services", icon: Scissors, label: "خدمات", matchStart: "/book" },
          { path: "/bookings", icon: CalendarCheck, label: "نوبت‌ها" },
          { path: "/profile", icon: User, label: "پروفایل" },
        ].map(({ path, icon: Icon, label, matchStart }) => {
          const active = matchStart ? pathname === path || pathname.startsWith(matchStart) : pathname === path;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-[10px] pb-[6px] transition-colors duration-150 ${
                active ? "text-foreground" : "text-black/40"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.5} />
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
