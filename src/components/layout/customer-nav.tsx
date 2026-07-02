"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Scissors, CalendarCheck, User } from "lucide-react";

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border/30">
      <div className="mx-auto max-w-lg flex px-2 pb-1">
        {[
          { path: "/", icon: Home, label: "خانه" },
          { path: "/services", icon: Scissors, label: "خدمات" },
          { path: "/bookings", icon: CalendarCheck, label: "نوبت‌ها", matchStart: "/book" },
          { path: "/profile", icon: User, label: "پروفایل" },
        ].map(({ path, icon: Icon, label, matchStart }) => {
          const active = matchStart ? pathname === path || pathname.startsWith(matchStart) : pathname === path;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-1 rounded-xl mx-0.5 transition-all duration-200 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${active ? "bg-primary/10" : ""}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
