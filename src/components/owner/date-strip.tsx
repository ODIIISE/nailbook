"use client";

import { useMemo, useRef, useEffect } from "react";
import { gregorianToJalali, toPersianDigits } from "@/lib/jalali";
import { getIranWeekDay } from "@/lib/slots";
import type { WorkingHours } from "@/lib/slots";

interface DateStripProps {
  workingHours: WorkingHours;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const JS_TO_IRAN_DAY = [1, 2, 3, 4, 5, 6, 0];

export function DateStrip({ workingHours, selectedDate, onSelectDate }: DateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    const result: Array<{
      date: Date;
      weekday: string;
      isWorkingDay: boolean;
      isToday: boolean;
      isSelected: boolean;
      jalaliDay: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dayKey = getIranWeekDay(date);
      const isWorkingDay = workingHours[dayKey] !== null;

      const isSelected =
        selectedDate !== null &&
        date.getFullYear() === selectedDate.getFullYear() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getDate() === selectedDate.getDate();

      const jsDay = date.getDay();
      const iranIndex = JS_TO_IRAN_DAY[jsDay];
      const jalali = gregorianToJalali(date);

      result.push({
        date,
        weekday: PERSIAN_WEEKDAYS_SHORT[iranIndex],
        isWorkingDay,
        isToday: i === 0,
        isSelected,
        jalaliDay: jalali.jd,
      });
    }
    return result;
  }, [today, workingHours, selectedDate]);

  useEffect(() => {
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector("[data-selected='true']");
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDate]);

  return (
    <div className="mx-auto max-w-lg">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 px-1"
        style={{
          scrollSnapType: "x mandatory",
          scrollPaddingInline: "20px",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {days.map((d, i) => (
          <button
            key={i}
            data-selected={d.isSelected}
            onClick={() => onSelectDate(d.date)}
            style={{ scrollSnapAlign: "center" }}
            className={`
              flex-shrink-0 min-w-[72px] h-[90px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200
              ${d.isSelected
                ? "bg-foreground text-background shadow-lg"
                : d.isWorkingDay
                  ? "bg-card border border-border text-foreground cursor-pointer hover:border-primary/30"
                  : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
              }
              ${d.isToday && !d.isSelected ? "border-2 border-primary/40" : ""}
            `}
          >
            <span className={`text-xs font-medium leading-none ${d.isSelected ? "text-background/70" : "text-muted-foreground"}`}>
              {d.weekday}
            </span>
            <span className="text-2xl font-bold leading-tight mt-1">
              {toPersianDigits(d.jalaliDay)}
            </span>
            {d.isToday && !d.isSelected && (
              <span className="text-[10px] font-semibold text-primary mt-0.5 leading-none">امروز</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
