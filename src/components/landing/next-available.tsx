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
    <div className="px-4 mb-8">
      <div className="mx-auto max-w-lg rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-[1.5px] shadow-[var(--shadow-elevated)]">
        <div className="rounded-3xl bg-card p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center h-7 w-7 rounded-xl bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-primary">نزدیک‌ترین زمان موجود</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-3xl font-bold text-foreground tracking-tight">
                  {toPersianDigits(jalali.jd)}
                </span>
                <div>
                  <span className="text-sm font-medium text-muted-foreground block">
                    {formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd).split(" ").slice(1).join(" ")}
                  </span>
                  <span className="text-xs text-muted-foreground">{weekday}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2.5">
                <div className="flex items-center justify-center h-5 w-5 rounded-md bg-muted">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                  {formatJalaliTime(time)}
                </span>
              </div>
            </div>

            <Button
              onClick={onBookNow}
              className="h-12 px-6 rounded-2xl font-semibold text-sm gap-2 shadow-md"
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
