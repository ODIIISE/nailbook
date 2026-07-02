"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, Sparkles } from "lucide-react";
import { formatJalaliDateShort, formatJalaliTime, toPersianDigits, getJalaliWeekdayFullName } from "@/lib/jalali";
import { gregorianToJalali } from "@/lib/jalali";

interface NextAvailableProps {
  date: Date | null;
  time: string | null;
  onBookNow: () => void;
}

export function NextAvailable({ date, time, onBookNow }: NextAvailableProps) {
  if (!date || !time) return null;

  const jalali = gregorianToJalali(date);
  const weekday = getJalaliWeekdayFullName(date);
  const monthName = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd).split(" ").slice(1).join(" ");

  return (
    <div className="px-4 mb-4">
      <div className="mx-auto max-w-lg glass rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-rose/10 shrink-0">
              <Sparkles className="h-5 w-5 text-rose" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] font-extrabold text-foreground leading-none">
                {toPersianDigits(jalali.jd)}
              </span>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-foreground leading-tight">{monthName}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{weekday}</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border mx-1" />
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-[15px] font-bold text-foreground">{formatJalaliTime(time)}</span>
            </div>
          </div>

          <Button onClick={onBookNow} className="h-10 px-5 rounded-full text-[13px]">
            رزرو
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
