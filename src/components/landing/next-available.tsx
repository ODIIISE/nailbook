"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, Sparkles } from "lucide-react";
import { formatJalaliDateShort, formatJalaliTime, toPersianDigits, getJalaliWeekdayName } from "@/lib/jalali";
import { gregorianToJalali } from "@/lib/jalali";

interface NextAvailableProps {
  date: Date | null;
  time: string | null;
  onBookNow: () => void;
}

export function NextAvailable({ date, time, onBookNow }: NextAvailableProps) {
  if (!date || !time) return null;

  const jalali = gregorianToJalali(date);
  const weekday = getJalaliWeekdayName(date);

  return (
    <div className="px-4 mb-6">
      <div className="mx-auto max-w-lg border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-bold text-primary uppercase tracking-wider">نزدیک‌ترین زمان</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className="text-[28px] font-extrabold text-foreground leading-none block">
                {toPersianDigits(jalali.jd)}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd).split(" ").slice(1).join(" ")}
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="text-[15px] font-bold text-foreground block">{weekday}</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[13px] text-muted-foreground">{formatJalaliTime(time)}</span>
              </div>
            </div>
          </div>

          <Button onClick={onBookNow} size="sm">
            رزرو کن
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
