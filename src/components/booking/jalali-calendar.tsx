"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import {
  getJalaliDate,
  jalaliToGregorian,
  toPersianDigits,
  gregorianToJalali,
  getJalaliWeekdayName,
} from "@/lib/jalali";
import { getIranWeekDay } from "@/lib/slots";
import type { WorkingHours } from "@/lib/slots";

interface JalaliCalendarProps {
  workingHours: WorkingHours;
  bookedDates: string[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function JalaliCalendar({
  workingHours,
  bookedDates,
  selectedDate,
  onSelectDate,
}: JalaliCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = useMemo(() => {
    const result: Array<{
      date: Date;
      dayNum: number;
      weekday: string;
      isWorkingDay: boolean;
      isFullyBooked: boolean;
      isToday: boolean;
      isSelected: boolean;
      jalaliDay: number;
      jalaliMonth: number;
    }> = [];

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayKey = getIranWeekDay(date);
      const isWorkingDay = workingHours[dayKey] !== null;
      const dateStr = date.toISOString().split("T")[0];
      const isFullyBooked = bookedDates.includes(dateStr);
      const jalali = gregorianToJalali(date);

      const isSelected =
        selectedDate &&
        selectedDate.getFullYear() === date.getFullYear() &&
        selectedDate.getMonth() === date.getMonth() &&
        selectedDate.getDate() === date.getDate();

      result.push({
        date,
        dayNum: date.getDate(),
        weekday: PERSIAN_WEEKDAYS_SHORT[
          date.getDay() === 6 ? 0 : date.getDay() === 5 ? 6 : date.getDay() - 1
        ],
        isWorkingDay,
        isFullyBooked,
        isToday: i === 0,
        isSelected: !!isSelected,
        jalaliDay: jalali.jd,
        jalaliMonth: jalali.jm,
      });
    }
    return result;
  }, [workingHours, bookedDates, selectedDate]);

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
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 px-1 -mx-1"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {days.map((d, i) => {
            const isDisabled = !d.isWorkingDay || d.isFullyBooked;
            return (
              <button
                key={i}
                data-selected={d.isSelected}
                disabled={isDisabled}
                onClick={() => !isDisabled && onSelectDate(d.date)}
                style={{ scrollSnapAlign: "center" }}
                className={`
                  flex-shrink-0 w-[68px] flex flex-col items-center py-3 px-2 rounded-2xl transition-all duration-200
                  focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:outline-none
                  ${d.isSelected
                    ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                    : isDisabled
                      ? "bg-muted/30 text-muted-foreground/30 cursor-not-allowed"
                      : "bg-card hover:bg-primary/5 text-foreground cursor-pointer active:scale-95"
                  }
                  ${d.isToday && !d.isSelected ? "ring-2 ring-primary/30" : ""}
                `}
              >
                <span className={`text-xs font-medium ${d.isSelected ? "text-white/70" : "text-muted-foreground"}`}>
                  {d.weekday}
                </span>
                <span className="text-lg font-bold mt-0.5">
                  {toPersianDigits(d.jalaliDay)}
                </span>
                {d.isToday && !d.isSelected && (
                  <span className="text-[10px] font-medium text-primary mt-0.5">امروز</span>
                )}
                {d.isWorkingDay && !d.isFullyBooked && !d.isSelected && !isDisabled && (
                  <span className="h-1 w-1 rounded-full bg-success mt-1" />
                )}
                {d.isFullyBooked && !d.isSelected && (
                  <span className="text-[10px] text-destructive mt-0.5">تکمیل</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
