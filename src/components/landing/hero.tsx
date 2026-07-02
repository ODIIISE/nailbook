"use client";

import { MapPin, Phone, Clock, Sparkles, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/jalali";
import type { SalonInfo } from "@/lib/mock-data";

interface HeroProps {
  salon: SalonInfo;
  onBookNow?: () => void;
}

function getWorkingHoursText(hours: Record<string, { open: string; close: string } | null>): string {
  const activeDays = Object.entries(hours).filter(([, v]) => v !== null);
  if (activeDays.length === 0) return "تعطیل";
  const firstDay = activeDays[0][1]!;
  const daysMap: Record<string, string> = {
    sat: "شنبه", sun: "یکشنبه", mon: "دوشنبه", tue: "سه‌شنبه",
    wed: "چهارشنبه", thu: "پنجشنبه", fri: "جمعه",
  };
  const dayNames = activeDays.map(([k]) => daysMap[k]).filter(Boolean);
  return `${dayNames[0]} تا ${dayNames[dayNames.length - 1]} · ${firstDay.open.slice(0, 5)} تا ${firstDay.close.slice(0, 5)}`;
}

export function Hero({ salon, onBookNow }: HeroProps) {
  return (
    <div className="px-4 pt-8 pb-6">
      <div className="mx-auto max-w-lg text-center animate-stagger">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl glass shadow-glass">
          <Sparkles className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="text-display text-foreground mb-2">
          {salon.name}
        </h1>
        {salon.slogan && (
          <p className="mb-2 text-body-lg text-foreground/70 font-medium">
            {salon.slogan}
          </p>
        )}
        <p className="mb-6 text-body text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {salon.description}
        </p>

        {onBookNow && (
          <Button
            className="w-full h-14 bg-rose hover:bg-rose/90 text-white rounded-2xl text-lg font-bold shadow-elevated transition-all duration-200 hover:scale-[0.98] active:scale-95"
            onClick={onBookNow}
          >
            رزرو کن
            <ChevronLeft className="h-5 w-5 mr-2" />
          </Button>
        )}

        <div className="glass rounded-3xl p-5 mt-6 shadow-card">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[15px] text-foreground">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/50">
                <MapPin className="h-4 w-4 text-foreground" />
              </div>
              <span>{salon.address}</span>
            </div>
            <div className="flex items-center gap-3 text-[15px] text-foreground">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/50">
                <Phone className="h-4 w-4 text-foreground" />
              </div>
              <span dir="ltr">{toPersianDigits(salon.phone)}</span>
            </div>
            <div className="flex items-center gap-3 text-[15px] text-foreground">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/50">
                <Clock className="h-4 w-4 text-foreground" />
              </div>
              <span>{getWorkingHoursText(salon.working_hours)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
