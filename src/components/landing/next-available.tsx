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
      <div className="mx-auto max-w-lg relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-[1px]">
        <div className="rounded-2xl bg-warm-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-medium text-primary">نزدیک‌ترین زمان موجود</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground tracking-tight">
                  {toPersianDigits(jalali.jd)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd).split(" ").slice(1).join(" ")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm text-muted-foreground">{weekday}</span>
                <span className="text-muted-foreground">·</span>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {formatJalaliTime(time)}
                </span>
              </div>
            </div>

            <Button
              onClick={onBookNow}
              className="h-11 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-sm gap-2"
            >
              رزرو کن
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
