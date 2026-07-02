"use client";

import { useMemo, useRef, useEffect } from "react";
import { gregorianToJalali, toPersianDigits } from "@/lib/jalali";

interface JalaliCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const JS_TO_IRAN_DAY = [1, 2, 3, 4, 5, 6, 0];

export function JalaliCalendar({
  selectedDate,
  onSelectDate,
}: JalaliCalendarProps) {
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
      isToday: boolean;
      isTomorrow: boolean;
      isSelected: boolean;
      jalaliDay: number;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const jalali = gregorianToJalali(date);

      const isSelected =
        selectedDate !== null &&
        date.getFullYear() === selectedDate.getFullYear() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getDate() === selectedDate.getDate();

      const jsDay = date.getDay();
      const iranIndex = JS_TO_IRAN_DAY[jsDay];

      result.push({
        date,
        weekday: PERSIAN_WEEKDAYS_SHORT[iranIndex],
        isToday: i === 0,
        isTomorrow: i === 1,
        isSelected,
        jalaliDay: jalali.jd,
      });
    }
    return result;
  }, [today, selectedDate]);

  useEffect(() => {
    if (scrollRef.current && selectedDate) {
      const selectedEl = scrollRef.current.querySelector("[data-selected='true']");
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDate]);

  return (
    <div className="mx-auto max-w-lg relative">
      <div
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto pb-2 px-5"
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
              flex-shrink-0 min-w-[72px] h-[90px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer active:scale-95
              focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:outline-none
              ${d.isSelected
                ? "bg-primary text-white"
                : "bg-card border border-border hover:border-primary/30 text-foreground"
              }
              ${d.isToday && !d.isSelected ? "border-2 border-primary/40" : ""}
            `}
          >
            <span className={`text-xs font-medium leading-none ${d.isSelected ? "text-white/70" : "text-muted-foreground"}`}>
              {d.weekday}
            </span>
            <span className="text-2xl font-bold leading-tight mt-1">
              {toPersianDigits(d.jalaliDay)}
            </span>
            {d.isToday && (
              <span className={`text-[10px] font-semibold mt-0.5 leading-none ${d.isSelected ? "text-white" : "text-primary"}`}>
                امروز
              </span>
            )}
            {d.isTomorrow && (
              <span className={`text-[10px] font-semibold mt-0.5 leading-none ${d.isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                فردا
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
