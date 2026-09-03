"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { gregorianToJalali, jalaliToGregorian, toPersianDigits, PERSIAN_MONTHS, JS_TO_IRAN_DAY, getJalaliMonthDays } from "@/lib/jalali";
import { CalendarDays, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTimeSlots, type WorkingHours } from "@/lib/slots";
import { getTehranDateKey } from "@/lib/time";
import { haptic } from "@/lib/haptics";

interface JalaliCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  showPast?: boolean;
  serviceDuration?: number;
  addonsDuration?: number;
  config?: {
    proximity_window_hours?: number;
    early_extra_hours?: number;
    late_extra_hours?: number;
    expand_threshold?: number;
    allow_overflow?: boolean;
    overflow_minutes?: number;
    optimization_mode?: "hybrid" | "legacy";
    suggestion_limit?: number;
    min_useful_gap_minutes?: number;
  };
  workingHours?: WorkingHours;
  bookings?: Array<{ date_gregorian: string; start_time: string; end_time: string; status?: string }>;
  blockedTimes?: Array<{ date_gregorian: string; start_time: string; end_time: string }>;
  salonConfig?: {
    slot_interval_minutes: number;
    slot_buffer_minutes: number;
  };
  specificDaysOff?: string[];
}

const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function JalaliCalendar({
  selectedDate,
  onSelectDate,
  showPast = false,
  serviceDuration = 0,
  addonsDuration = 0,
  config,
  workingHours,
  bookings = [],
  blockedTimes = [],
  salonConfig,
  specificDaysOff = [],
}: JalaliCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

  const today = useMemo(() => {
    // Use Tehran time for "today" calculation — UTC noon to avoid timezone drift
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    return new Date(Date.UTC(Number(get("year")), Number(get("month")) - 1, Number(get("day")), 12, 0, 0));
  }, []);

  const days = useMemo(() => {
    const result: Array<{
      date: Date;
      weekday: string;
      isToday: boolean;
      isTomorrow: boolean;
      isSelected: boolean;
      jalaliDay: number;
      hasAvailability: boolean;
      isFullyBooked: boolean;
    }> = [];

    const start = showPast ? -7 : 0;
    const end = showPast ? 7 : 6;

    for (let i = start; i <= end; i++) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + i);

      const jalali = gregorianToJalali(date);

      const isSelected =
        selectedDate !== null &&
        date.getUTCFullYear() === selectedDate.getUTCFullYear() &&
        date.getUTCMonth() === selectedDate.getUTCMonth() &&
        date.getUTCDate() === selectedDate.getUTCDate();

      const jsDay = date.getDay();
      const iranIndex = JS_TO_IRAN_DAY[jsDay];

      // Compute day availability if we have the data
      let hasAvailability = true;
      let isFullyBooked = false;

      if (workingHours && salonConfig && serviceDuration > 0) {
        const dateStr = getTehranDateKey(date);
        const dayBookings = bookings
          .filter((b) => {
            const bookingDate = b.date_gregorian.split("T")[0];
            return bookingDate === dateStr && (b.status === undefined || b.status === "reserved" || b.status === "confirmed" || b.status === "in_progress");
          })
          .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
        const dayBlocked = blockedTimes.filter((b) => {
          const blockDate = b.date_gregorian.split("T")[0];
          return blockDate === dateStr;
        });

        const slots = generateTimeSlots(
          workingHours,
          date,
          serviceDuration,
          addonsDuration,
          salonConfig.slot_interval_minutes,
          salonConfig.slot_buffer_minutes,
          dayBookings,
          dayBlocked,
          config,
          specificDaysOff
        );

        const availableSlots = slots.filter((s) => s.available);
        hasAvailability = availableSlots.length > 0;
        isFullyBooked = slots.length > 0 && availableSlots.length === 0;
      }

      result.push({
        date,
        weekday: PERSIAN_WEEKDAYS_SHORT[iranIndex],
        isToday: i === 0,
        isTomorrow: i === 1,
        isSelected,
        jalaliDay: jalali.jd,
        hasAvailability,
        isFullyBooked,
      });
    }
    return result;
  }, [today, selectedDate, showPast, workingHours, salonConfig, serviceDuration, addonsDuration, bookings, blockedTimes, config, specificDaysOff]);

  // Scroll to selected date
  useEffect(() => {
    if (scrollRef.current && selectedDate) {
      const selectedEl = scrollRef.current.querySelector("[data-selected='true']");
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDate]);

  return (
    <>
      <div className="mx-auto max-w-lg relative">
        <div className="flex items-center justify-between px-4 mb-2">
          <span className="text-xs font-bold text-muted-foreground">انتخاب تاریخ</span>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-extrabold text-primary"
          >
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            تقویم
          </button>
        </div>
        {/* Outer wrapper with padding to prevent shadow clipping */}
        <div className="px-1">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-3 pt-1 px-3 scrollbar-hide"
          >
          {days.map((d, i) => (
            <button
              key={i}
              data-selected={d.isSelected}
              onClick={() => {
                if (!d.isSelected) haptic.tap();
                onSelectDate(d.date);
              }}
              className={`flex h-20 min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-full px-3 text-sm font-bold ${
                d.isSelected
                  ? "bg-primary text-primary-foreground"
                  : d.isFullyBooked
                    ? "border border-border bg-muted opacity-40"
                    : d.isToday
                      ? "border border-ring bg-card text-foreground"
                      : "border border-border bg-card text-foreground"
              }`}
            >
              {/* Weekday label */}
              <span
                className={`text-xs font-medium leading-none ${
                  d.isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                {d.weekday}
              </span>

              {/* Day number */}
              <span
                className={`text-xl font-bold leading-tight mt-1 ${
                  d.isSelected ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {toPersianDigits(d.jalaliDay)}
              </span>

              {/* Today label */}
              {d.isToday && (
                <span
                  className={`text-xs font-semibold mt-0.5 leading-none ${
                    d.isSelected ? "text-primary-foreground/80" : "text-foreground"
                  }`}
                >
                  امروز
                </span>
              )}

              {/* Tomorrow label */}
              {d.isTomorrow && (
                <span
                  className={`text-xs font-semibold mt-0.5 leading-none ${
                    d.isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  فردا
                </span>
              )}

              {/* Fully booked label */}
              {d.isFullyBooked && !d.isSelected && (
                <span className="text-xs font-medium mt-0.5 leading-none text-destructive">
                  تکمیل
                </span>
              )}
            </button>
          ))}
          </div>
        </div>
      </div>

      {showModal && (
        <CalendarModal
          selectedDate={selectedDate}
          onSelect={(date) => {
            onSelectDate(date);
            setShowModal(false);
          }}
          onClose={() => setShowModal(false)}
          today={today}
        />
      )}
    </>
  );
}

/* ─── Month-view Calendar Modal ─── */

function CalendarModal({
  selectedDate,
  onSelect,
  onClose,
  today,
}: {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  onClose: () => void;
  today: Date;
}) {
  const jalaliToday = gregorianToJalali(today);
  const [viewMonth, setViewMonth] = useState(jalaliToday.jm);
  const [viewYear, setViewYear] = useState(jalaliToday.jy);

  const daysInMonth = getJalaliMonthDays(viewYear, viewMonth);

  const firstDayDate = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstDayJs = firstDayDate.getDay();
  const firstDayIran = JS_TO_IRAN_DAY[firstDayJs];

  const cells = useMemo(() => {
    const result: Array<{ day: number | null; date: Date | null; isToday: boolean; isSelected: boolean; isPast: boolean }> = [];
    const todayKey = getTehranDateKey(today);
    for (let i = 0; i < firstDayIran; i++) {
      result.push({ day: null, date: null, isToday: false, isSelected: false, isPast: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const gDate = jalaliToGregorian(viewYear, viewMonth, d);
      const gKey = getTehranDateKey(gDate);
      const isSelected = selectedDate !== null && gKey === getTehranDateKey(selectedDate);
      const isPast = gKey < todayKey;
      result.push({ day: d, date: gDate, isToday: gKey === todayKey, isSelected, isPast });
    }
    return result;
  }, [viewYear, viewMonth, daysInMonth, firstDayIran, today, selectedDate]);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Dialog semantics: Escape closes, background scroll locks, focus enters
  // the panel (and returns on close) — parity with the other modals.
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="انتخاب تاریخ">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="ماه قبل"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="text-center">
            <p className="text-sm font-extrabold text-foreground">{PERSIAN_MONTHS[viewMonth - 1]}</p>
            <p className="text-xs text-muted-foreground">{toPersianDigits(viewYear)}</p>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="ماه بعد"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Year selector */}
        <div className="mb-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="سال قبل"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[60px] text-center text-sm font-bold text-foreground">
            {toPersianDigits(viewYear)}
          </span>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="سال بعد"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground">
          {PERSIAN_WEEKDAYS_SHORT.map((wd) => (
            <div key={wd} className="py-1">
              {wd}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (cell.day === null) {
              return <div key={`empty-${i}`} />;
            }
            return (
              <button
                key={cell.day}
                disabled={cell.isPast}
                onClick={() => cell.date && onSelect(cell.date)}
                className={`
                  flex h-11 w-full items-center justify-center rounded-full text-sm font-bold
                  ${cell.isSelected
                    ? "bg-primary text-primary-foreground"
                    : cell.isToday
                      ? "border border-ring bg-card text-foreground"
                      : cell.isPast
                        ? "text-muted-foreground opacity-30 cursor-not-allowed"
                        : "text-foreground"
                  }
                `}
              >
                {toPersianDigits(cell.day)}
              </button>
            );
          })}
        </div>

        <Button variant="outline" className="w-full mt-4" onClick={onClose}>
          بستن
        </Button>
      </div>
    </div>
  );
}
