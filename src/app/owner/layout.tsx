"use client";

import { usePathname, useRouter } from "next/navigation";
import { Calendar, Clock, Briefcase, Settings } from "lucide-react";
import { useSalon } from "@/lib/salon-context";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { salon } = useSalon();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center justify-center">
          <h1 className="text-[17px] font-bold text-foreground">{salon.name}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg">
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-border">
        <div className="mx-auto max-w-lg flex">
          <button
            onClick={() => router.push("/owner")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive("/owner") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-bold">زمان‌بندی</span>
          </button>
          <button
            onClick={() => router.push("/owner/schedule")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive("/owner/schedule") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-[10px] font-bold">ساعات کاری</span>
          </button>
          <button
            onClick={() => router.push("/owner/services")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive("/owner/services") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-5 w-5" />
            <span className="text-[10px] font-bold">خدمات</span>
          </button>
          <button
            onClick={() => router.push("/owner/settings")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive("/owner/settings") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-bold">تنظیمات</span>
          </button>
        </div>
      </div>
    </div>
  );
}
