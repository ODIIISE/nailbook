"use client";

import { Clock, Sparkles, ChevronLeft, Zap, CalendarX2, CalendarOff } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { haptic } from "@/lib/haptics";
import type { TimeSlot } from "@/lib/slots";

interface TimeSlotsProps {
  date: Date | null;
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
  onGoToNextDay?: () => void;
}

export function TimeSlots({ date, slots, selectedSlot, onSelectSlot, onGoToNextDay }: TimeSlotsProps) {
  if (!date) {
    return (
      <div className="mx-auto max-w-lg glass rounded-3xl p-8 text-center">
        <Clock className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-body text-muted-foreground">تاریخ را انتخاب کنید</p>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);
  const bookedSlots = slots.filter((s) => !s.available && (s.booked || s.locked));
  const unavailableSlots = slots.filter((s) => !s.available && !s.booked && !s.locked);

  const hasBookedSlots = bookedSlots.length > 0;
  const hasNoAvailability = availableSlots.length === 0;
  const emptyState = slots.length === 0
    ? "closed"
    : hasBookedSlots
      ? "full"
      : "unsuitable";

  // Every day with no selectable time uses an intentional empty state. The copy
  // changes based on whether the salon is closed, full, or has no suitable gap.
  if (hasNoAvailability) {
    return (
      <div className="mx-auto max-w-lg animate-fade">
        <section
          className="glass overflow-hidden rounded-[24px] shadow-card"
          aria-label={
            emptyState === "full"
              ? "ظرفیت این روز تکمیل است"
              : emptyState === "closed"
                ? "این روز ساعت کاری ندارد"
                : "برای این خدمت ساعت مناسبی نیست"
          }
        >
          <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
            <div role="status" aria-live="polite" className="flex items-center gap-2 text-small font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/60" aria-hidden="true" />
              {emptyState === "full"
                ? "ظرفیت این روز تکمیل است"
                : emptyState === "closed"
                  ? "ساعتی برای رزرو نیست"
                  : "ساعت قابل رزرو نیست"}
            </div>
            <span className="tabular-nums text-small text-muted-foreground">
              {emptyState === "full" ? `${toPersianDigits(0)} ساعت خالی` : emptyState === "closed" ? "روز تعطیل" : "۰ قابل رزرو"}
            </span>
          </div>

          <div className="px-6 py-9 text-center sm:px-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[18px] border border-border bg-muted/45 text-foreground shadow-xs animate-scale">
              {emptyState === "full" ? (
                <CalendarX2 className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
              ) : emptyState === "closed" ? (
                <CalendarOff className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
              ) : (
                <Clock className="h-7 w-7" strokeWidth={1.7} aria-hidden="true" />
              )}
            </div>
            <h3 className="text-h3 font-bold text-foreground">
              {emptyState === "full"
                ? "این روز کاملاً پر شده"
                : emptyState === "closed"
                  ? "برای این روز ساعت کاری نداریم"
                  : "زمان قابل رزرو پیدا نشد"}
            </h3>
            <p className="mx-auto mt-3 max-w-[280px] text-caption leading-6 text-muted-foreground">
              {emptyState === "full"
                ? "همه زمان‌های مناسب برای این خدمت گرفته شده‌اند."
                : emptyState === "closed"
                  ? "برای این روز زمان قابل رزرو نداریم؛ روز دیگری را انتخاب کنید."
                  : "در این روز زمان قابل رزرو برای این خدمت پیدا نشد؛ روز دیگری را امتحان کنید."}
            </p>
          </div>

          {onGoToNextDay && (
            <div className="border-t border-border/70 px-5 pb-5 pt-4">
              <button
                onClick={() => {
                  haptic.tap();
                  onGoToNextDay();
                }}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-body font-bold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
              >
                {emptyState === "full" ? "برنامه فردا را ببینید" : "روز بعد را بررسی کنید"}
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="mt-3 text-center text-small text-muted-foreground/75">
                یا تاریخ دیگری را از تقویم انتخاب کنید
              </p>
            </div>
          )}
        </section>
      </div>
    );
  }

  const suggestedSlots = availableSlots.filter((s) => s.suggested);
  const otherSlots = availableSlots.filter((s) => !s.suggested);
  const nextAvailable = availableSlots.length > 0 ? availableSlots[0] : null;
  const remainingSlots = availableSlots.length;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Legend + remaining count */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" />
            <span className="text-caption text-muted-foreground">موجود</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-hatched" />
            <span className="text-caption text-muted-foreground">رزرو شده</span>
          </div>
        </div>
        <span className="text-caption font-bold text-foreground">
          {toPersianDigits(remainingSlots)} ساعت خالی
        </span>
      </div>

      {nextAvailable && (
        <div className="flex items-center justify-center gap-1.5" role="note">
          <Zap className="h-3 w-3 text-primary" />
          <p className="text-small text-muted-foreground">
            نزدیک‌ترین ساعت آزاد:{" "}
            <span className="font-bold tabular-nums text-foreground">
              {toPersianDigits(nextAvailable.time.slice(0, 5))}
            </span>
          </p>
        </div>
      )}

      {/* Suggested slots */}
      {suggestedSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-caption font-bold text-primary">ساعت‌های پیشنهادی</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 animate-stagger">
            {suggestedSlots.map((slot) => (
              <SlotButton
                key={slot.time}
                slot={slot}
                isSelected={selectedSlot === slot.time}
                onSelect={() => onSelectSlot(slot.time)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other available slots */}
      {otherSlots.length > 0 && (
        <div>
          {suggestedSlots.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1 pt-2 border-t border-border/30">
              <span className="text-caption text-muted-foreground">ساعت‌های دیگر</span>
            </div>
          )}
          {suggestedSlots.length === 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-caption text-muted-foreground">ساعت‌های موجود</span>
            </div>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 animate-stagger">
            {otherSlots.map((slot) => (
              <SlotButton
                key={slot.time}
                slot={slot}
                isSelected={selectedSlot === slot.time}
                onSelect={() => onSelectSlot(slot.time)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Booked/locked slots */}
      {bookedSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1 pt-2 border-t border-border/30">
            <span className="text-caption text-muted-foreground">ساعت‌های رزرو شده</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {bookedSlots.map((slot) => (
              <SlotButton
                key={slot.time}
                slot={{ ...slot, available: false }}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unavailable slots (past, dead gap, doesn't fit service) */}
      {unavailableSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1 pt-2 border-t border-border/30">
            <span className="text-caption text-muted-foreground">ساعت‌های غیرقابل رزرو</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {unavailableSlots.map((slot) => (
              <SlotButton
                key={slot.time}
                slot={slot}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SlotButton({
  slot,
  isSelected,
  onSelect,
}: {
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const formattedTime = slot.time.split(":").map((p) => toPersianDigits(p)).join(":");
  const isBooked = slot.booked || slot.locked;
  const isUnavailable = !slot.available && !isBooked;

  return (
    <button
      disabled={!slot.available}
      onClick={() => {
        if (!slot.available) return;
        haptic.tap();
        onSelect();
      }}
      aria-label={`${formattedTime} ${slot.available ? "موجود" : slot.booked ? "رزرو شده" : slot.locked ? "مسدود" : "غیرقابل رزرو"}`}
      className="h-[48px] min-h-[44px] rounded-xl text-caption font-bold transition-all duration-200 select-none relative overflow-hidden focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
      style={{
        background: isSelected
          ? "var(--foreground)"
          : "var(--card)",
        color: isSelected
          ? "var(--background)"
          : isBooked || isUnavailable
            ? "var(--muted-foreground)"
            : "var(--foreground)",
        border: isSelected ? "none" : "1px solid var(--border)",
        boxShadow: "none",
        cursor: slot.available ? "pointer" : "not-allowed",
        opacity: isBooked ? 0.5 : isUnavailable ? 0.35 : 1,
      }}
    >
      {/* Bold hatching for reserved slots */}
      {isBooked && (
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "repeating-linear-gradient(-45deg, transparent, transparent 2px, var(--muted-foreground) 2px, var(--muted-foreground) 4px)",
            opacity: 0.2,
          }}
        />
      )}
      {/* Cross-hatch for unavailable slots */}
      {isUnavailable && (
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: "repeating-linear-gradient(-45deg, transparent, transparent 3px, var(--muted-foreground) 3px, var(--muted-foreground) 5px), repeating-linear-gradient(45deg, transparent, transparent 3px, var(--muted-foreground) 3px, var(--muted-foreground) 5px)",
            opacity: 0.15,
          }}
        />
      )}
      {/* Selection overlay */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{
          background: "var(--foreground)",
          opacity: isSelected ? 1 : 0,
          transition: "opacity 0.15s ease",
        }}
      />
      <span className="relative z-10">{formattedTime}</span>
    </button>
  );
}
