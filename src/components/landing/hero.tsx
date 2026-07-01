"use client";

import { MapPin, Phone, Clock, Sparkles } from "lucide-react";
import type { SalonInfo } from "@/lib/mock-data";

interface HeroProps {
  salon: SalonInfo;
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
  const startDay = dayNames[0];
  const endDay = dayNames[dayNames.length - 1];
  return `${startDay} تا ${endDay} · ${firstDay.open.slice(0, 5)} تا ${firstDay.close.slice(0, 5)}`;
}

export function Hero({ salon }: HeroProps) {
  return (
    <div className="relative">
      <div className="relative">
        <img
          src="https://picsum.photos/seed/nailsalon/800/400"
          alt={salon.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-[13px] font-bold text-white/80 uppercase tracking-wider">رزرو آنلاین</span>
          </div>
          <h1 className="text-display text-white mb-1">{salon.name}</h1>
          {salon.slogan && (
            <p className="text-[15px] text-white/80">{salon.slogan}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
          {salon.description}
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[15px] text-foreground">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span>{salon.address}</span>
          </div>
          <div className="flex items-center gap-3 text-[15px] text-foreground">
            <Phone className="h-4 w-4 text-primary shrink-0" />
            <span dir="ltr">{salon.phone}</span>
          </div>
          <div className="flex items-center gap-3 text-[15px] text-foreground">
            <Clock className="h-4 w-4 text-primary shrink-0" />
            <span>{getWorkingHoursText(salon.working_hours)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
