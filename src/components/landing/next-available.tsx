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
    <div className="px-4 mb-6">
      <div className="mx-auto max-w-lg glass rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-foreground/5">
            <Sparkles className="h-4 w-4 text-foreground" />
          </div>
          <span className="text-[13px] font-bold text-foreground uppercase tracking-wider">نزدیک‌ترین زمان موجود</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-[44px] font-extrabold text-foreground leading-none tracking-tight">
                {toPersianDigits(jalali.jd)}
              </span>
              <div>
                <span className="text-[17px] font-bold text-foreground block">
                  {monthName}
                </span>
                <span className="text-[15px] text-muted-foreground">{weekday}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-foreground/5">
                <Clock className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <span className="text-[17px] font-bold text-foreground">
                  {formatJalaliTime(time)}
                </span>
                <span className="text-[13px] text-muted-foreground mr-2">ساعت</span>
              </div>
            </div>
          </div>

          <Button onClick={onBookNow} className="h-12 px-6 rounded-full">
            رزرو کن
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
