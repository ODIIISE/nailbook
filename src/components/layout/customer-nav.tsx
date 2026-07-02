"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Scissors, CalendarCheck, User } from "lucide-react";
import { useSalon } from "@/lib/salon-context";

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { salon } = useSalon();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-border/50">
      <div className="mx-auto max-w-lg flex">
        <button
          onClick={() => router.push("/")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            isActive("/") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold">خانه</span>
        </button>
        <button
          onClick={() => router.push("/services")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            isActive("/services") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scissors className="h-5 w-5" />
          <span className="text-[10px] font-bold">خدمات</span>
        </button>
        <button
          onClick={() => router.push("/bookings")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            isActive("/bookings") || pathname.startsWith("/book") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold">نوبت‌های من</span>
        </button>
        <button
          onClick={() => router.push("/profile")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            isActive("/profile") ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold">پروفایل</span>
        </button>
      </div>
    </div>
  );
}
