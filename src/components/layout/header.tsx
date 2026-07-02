"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toPersianDigits } from "@/lib/jalali";
import {
  Menu,
  X,
  ArrowRight,
  Phone,
  AtSign,
  MapPin,
  Clock,
  User,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useSalon } from "@/lib/salon-context";

interface HeaderProps {
  showBack?: boolean;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export function Header({ showBack = false, title, subtitle, onBack }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { salon } = useSalon();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";

  return (
    <>
      <div className="sticky top-0 z-30 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && !isHome ? (
              <Button variant="ghost" size="icon-sm" onClick={onBack || (() => router.back())}>
                <ArrowRight className="h-5 w-5" />
              </Button>
            ) : null}
            {title ? (
              <div>
                <h1 className="text-[17px] font-bold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-[13px] text-muted-foreground">{subtitle}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-foreground" />
                <span className="text-[17px] font-bold text-foreground">{salon.name}</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-0 right-0 h-full w-72 glass-strong rounded-l-3xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[17px] font-bold text-foreground">{salon.name}</span>
                <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => { router.push("/"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">صفحه اصلی</span>
                </button>

                <button
                  onClick={() => { router.push("/book"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">رزرو نوبت</span>
                </button>

                <Separator className="my-2 bg-white/20" />

                <button
                  onClick={() => { router.push("/owner/login"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">ورود مدیر</span>
                </button>

                <Separator className="my-2 bg-white/20" />

                <a
                  href={`tel:${salon.phone}`}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]" dir="ltr">{toPersianDigits(salon.phone)}</span>
                </a>

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <AtSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">اینستاگرام</span>
                </a>

                <Separator className="my-2 bg-white/20" />

                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground">{salon.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[13px] text-muted-foreground">
                      {(() => {
                        const hours = salon.working_hours;
                        const active = Object.entries(hours).filter(([,v]) => v !== null);
                        if (!active.length) return "تعطیل";
                        const map: Record<string,string> = {sat:"شنبه",sun:"یکشنبه",mon:"دوشنبه",tue:"سه‌شنبه",wed:"چهارشنبه",thu:"پنجشنبه",fri:"جمعه"};
                        const days = active.map(([k]) => map[k]).filter(Boolean);
                        return `${days[0]} تا ${days[days.length-1]} · ${active[0][1]!.open.slice(0,5)} - ${active[0][1]!.close.slice(0,5)}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
