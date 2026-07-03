"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Clock, Briefcase, Settings, Menu, X, Home, LogOut, CircleDot } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useSalon } from "@/lib/salon-context";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { salon } = useSalon();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-background h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center justify-between">
          <h1 className="text-[17px] font-bold text-foreground">{salon.name}</h1>
          <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 glass-strong rounded-l-3xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[17px] font-bold text-foreground">منو</span>
                <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => { router.push("/"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">صفحه اصلی</span>
                </button>

                <Separator className="my-2 bg-white/20" />

                <button
                  onClick={() => { router.push("/owner/settings"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">تنظیمات</span>
                </button>

                <button
                  onClick={() => { router.push("/owner/schedule"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">ساعات کاری</span>
                </button>

                <button
                  onClick={() => { router.push("/owner/services"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">مدیریت خدمات</span>
                </button>

                <button
                  onClick={() => { router.push("/owner/highlights"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <CircleDot className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">مدیریت هایلایت</span>
                </button>

                <Separator className="my-2 bg-white/20" />

                <button
                  onClick={() => {
                    document.cookie = "owner_session=; path=/owner; max-age=0";
                    router.push("/owner/login");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-red-500/10 text-right transition-colors"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span className="text-[15px] text-red-500">خروج</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-lg">
        {children}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border">
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
            onClick={() => router.push("/owner/highlights")}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              isActive("/owner/highlights") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CircleDot className="h-5 w-5" />
            <span className="text-[10px] font-bold">هایلایت</span>
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
