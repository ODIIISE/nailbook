"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import {
  getJalaliDate,
  jalaliToGregorian,
  getJalaliMonthDays,
  getJalaliMonthName,
  toPersianDigits,
  PERSIAN_WEEKDAYS,
  gregorianToJalali,
} from "@/lib/jalali";
import { getIranWeekDay } from "@/lib/slots";
import type { WorkingHours } from "@/lib/slots";

interface JalaliCalendarProps {
  workingHours: WorkingHours;
  bookedDates: string[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
}

export function JalaliCalendar({
  workingHours,
  bookedDates,
  selectedDate,
  onSelectDate,
}: JalaliCalendarProps) {
  const today = getJalaliDate();
  const [currentMonth, setCurrentMonth] = useState(today.month);
  const [currentYear, setCurrentYear] = useState(today.year);

  const daysInMonth = getJalaliMonthDays(currentYear, currentMonth);

  const firstDayDate = jalaliToGregorian(currentYear, currentMonth, 1);
  const firstDayJs = firstDayDate.getDay();
  const iranFirstDay = firstDayJs === 6 ? 0 : firstDayJs === 5 ? 6 : firstDayJs - 1;

  const days = useMemo(() => {
    const result: Array<{
      day: number;
      date: Date;
      isWorkingDay: boolean;
      isFullyBooked: boolean;
      isPast: boolean;
      isSelected: boolean;
    }> = [];

    for (let i = 1; i <= daysInMonth; i++) {
      const date = jalaliToGregorian(currentYear, currentMonth, i);
      const dayKey = getIranWeekDay(date);
      const isWorkingDay = workingHours[dayKey] !== null;

      const dateStr = date.toISOString().split("T")[0];
      const isFullyBooked = bookedDates.includes(dateStr);

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const isPast = date < now;

      const isSelected =
        selectedDate &&
        selectedDate.getFullYear() === date.getFullYear() &&
        selectedDate.getMonth() === date.getMonth() &&
        selectedDate.getDate() === date.getDate();

      result.push({
        day: i,
        date,
        isWorkingDay,
        isFullyBooked,
        isPast,
        isSelected: !!isSelected,
      });
    }
    return result;
  }, [currentYear, currentMonth, daysInMonth, workingHours, bookedDates, selectedDate]);

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <h3 className="font-semibold text-foreground">
          {getJalaliMonthName(currentMonth)} {toPersianDigits(currentYear)}
        </h3>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {PERSIAN_WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-1"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: iranFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((d) => {
          const isDisabled = d.isPast || !d.isWorkingDay || d.isFullyBooked;

          return (
            <button
              key={d.day}
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelectDate(d.date)}
              className={`
                relative h-10 rounded-lg text-sm font-medium transition-all
                ${d.isSelected ? "bg-navy text-white shadow-md" : ""}
                ${!d.isSelected && d.isWorkingDay && !d.isPast && !d.isFullyBooked ? "hover:bg-navy/10 text-foreground cursor-pointer" : ""}
                ${isDisabled && !d.isSelected ? "text-muted-foreground/40 cursor-not-allowed" : ""}
                ${d.isFullyBooked && !d.isSelected ? "line-through" : ""}
              `}
            >
              {toPersianDigits(d.day)}
              {d.isWorkingDay && !d.isPast && !d.isFullyBooked && !d.isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          روز کاری
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          تعطیل
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          تکمیل
        </div>
      </div>
    </Card>
  );
}
