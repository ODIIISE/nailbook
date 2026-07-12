"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { gregorianToJalali, jalaliToGregorian, toPersianDigits, PERSIAN_MONTHS, DAYS_IN_MONTH, JS_TO_IRAN_DAY } from "@/lib/jalali";
import { CalendarDays, ChevronRight, ChevronLeft, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateTimeSlots, type WorkingHours } from "@/lib/slots";
import { getTehranDateKey } from "@/lib/time";

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
  };
  workingHours?: WorkingHours;
  bookings?: Array<{ date_gregorian: string; start_time: string; end_time: string; status?: string }>;
  blockedTimes?: Array<{ date_gregorian: string; start_time: string; end_time: string }>;
  salonConfig?: {
    slot_interval_minutes: number;
    slot_buffer_minutes: number;
  };
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
}: JalaliCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);

  // Touch drag state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

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
      hasAvailability: boolean;
      isFullyBooked: boolean;
    }> = [];

    const start = showPast ? -7 : 0;
    const end = showPast ? 7 : 6;

    for (let i = start; i <= end; i++) {
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

      // Compute day availability if we have the data
      let hasAvailability = true;
      let isFullyBooked = false;

      if (workingHours && salonConfig && serviceDuration > 0) {
        const dateStr = getTehranDateKey(date);
        const dayBookings = bookings
          .filter((b) => b.date_gregorian === dateStr && b.status === "confirmed")
          .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
        const dayBlocked = blockedTimes.filter((b) => b.date_gregorian === dateStr);

        const slots = generateTimeSlots(
          workingHours,
          date,
          serviceDuration,
          addonsDuration,
          salonConfig.slot_interval_minutes,
          salonConfig.slot_buffer_minutes,
          dayBookings,
          dayBlocked,
          config
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
  }, [today, selectedDate, showPast, workingHours, salonConfig, serviceDuration, addonsDuration, bookings, blockedTimes, config]);

  // Scroll to selected date
  useEffect(() => {
    if (scrollRef.current && selectedDate) {
      const selectedEl = scrollRef.current.querySelector("[data-selected='true']");
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [selectedDate]);

  // Native wheel handler for horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Touch drag handlers
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startX.current = e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
    touchStartY.current = e.touches[0].pageY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const x = e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0);
    const y = e.touches[0].pageY;
    const deltaX = Math.abs(x - startX.current);
    const deltaY = Math.abs(y - touchStartY.current);

    // Only prevent default for horizontal swipes (not vertical scrolling)
    if (deltaX > deltaY) {
      e.preventDefault();
      const walk = (x - startX.current) * 1.5;
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <>
      <div className="mx-auto max-w-lg relative">
        <div className="flex items-center justify-between px-4 mb-2">
          <span className="text-[13px] text-muted-foreground">انتخاب تاریخ</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(true)}
            className="text-primary gap-1.5 h-8 px-2"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="text-[12px]">تقویم</span>
          </Button>
        </div>
        <div
          ref={scrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex gap-2 overflow-x-auto pb-1 px-4 scrollbar-hide"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {days.map((d, i) => (
            <button
              key={i}
              data-selected={d.isSelected}
              onClick={() => onSelectDate(d.date)}
              className={`
                flex-shrink-0 min-w-[64px] h-[80px] flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer active:scale-95
                focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:outline-none
                ${d.isSelected
                  ? "bg-primary text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
                  : d.isFullyBooked
                    ? "bg-muted border border-border text-foreground opacity-60"
                    : "bg-card border border-border hover:border-primary/30 text-foreground"
                }
                ${d.isToday && !d.isSelected ? "border-2 border-primary/40" : ""}
              `}
            >
              <span className={`text-[11px] font-medium leading-none ${d.isSelected ? "text-white/70" : "text-muted-foreground"}`}>
                {d.weekday}
              </span>
              <span className="text-xl font-bold leading-tight mt-1">
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
              {d.isFullyBooked && !d.isSelected && (
                <span className="text-[9px] font-medium mt-0.5 leading-none text-destructive">
                  تکمیل
                </span>
              )}
            </button>
          ))}
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

  const daysInMonth = DAYS_IN_MONTH[viewMonth - 1];

  const firstDayDate = jalaliToGregorian(viewYear, viewMonth, 1);
  const firstDayJs = firstDayDate.getDay();
  const firstDayIran = JS_TO_IRAN_DAY[firstDayJs];

  const cells = useMemo(() => {
    const result: Array<{ day: number | null; date: Date | null; isToday: boolean; isSelected: boolean; isPast: boolean }> = [];
    for (let i = 0; i < firstDayIran; i++) {
      result.push({ day: null, date: null, isToday: false, isSelected: false, isPast: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const gDate = jalaliToGregorian(viewYear, viewMonth, d);
      const gKey = gDate.toISOString().slice(0, 10);
      const todayKey = today.toISOString().slice(0, 10);
      const isSelected = selectedDate !== null && gKey === selectedDate.toISOString().slice(0, 10);
      const isPast = gDate.getTime() < today.getTime();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-3xl p-5 animate-scale shadow-elevated">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-h3 text-foreground">{PERSIAN_MONTHS[viewMonth - 1]}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Year selector */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Button variant="ghost" size="icon-sm" onClick={() => setViewYear((y) => y - 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-[14px] font-bold text-foreground min-w-[60px] text-center">
            {toPersianDigits(viewYear)}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => setViewYear((y) => y + 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {PERSIAN_WEEKDAYS_SHORT.map((wd) => (
            <div key={wd} className="text-center text-[11px] font-bold text-muted-foreground py-1">
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
                  h-10 rounded-xl text-[13px] font-bold transition-all duration-150
                  ${cell.isSelected
                    ? "bg-primary text-white shadow-md"
                    : cell.isToday
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : cell.isPast
                        ? "text-muted-foreground/30 cursor-not-allowed"
                        : "text-foreground hover:bg-muted active:scale-95 cursor-pointer"
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
