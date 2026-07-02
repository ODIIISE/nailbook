"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Scissors, CalendarCheck, User } from "lucide-react";
import { useSalon } from "@/lib/salon-context";

export function CustomerNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { salon } = useSalon();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-border">
      <div className="mx-auto max-w-lg flex">
        <button
          onClick={() => router.push("/")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold">خانه</span>
        </button>
        <button
          onClick={() => router.push("/")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            pathname === "/" ? "text-muted-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scissors className="h-5 w-5" />
          <span className="text-[10px] font-bold">خدمات</span>
        </button>
        <button
          onClick={() => router.push("/book")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            pathname === "/book" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold">نوبت‌های من</span>
        </button>
        <button
          onClick={() => router.push("/")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-bold">پروفایل</span>
        </button>
      </div>
    </div>
  );
}
