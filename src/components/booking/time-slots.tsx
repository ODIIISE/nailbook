"use client";

import { Clock, Ban, Sparkles, ChevronLeft } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
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

  if (slots.length === 0) {
    return (
      <div className="mx-auto max-w-lg glass rounded-3xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-muted mx-auto flex items-center justify-center mb-3">
          <Ban className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-body font-bold text-foreground mb-1">ساعتی برای این روز موجود نیست</p>
        <p className="text-caption text-muted-foreground mb-4">لطفاً تاریخ دیگری انتخاب کنید</p>

        {onGoToNextDay && (
          <button
            onClick={onGoToNextDay}
            className="mt-2 w-full h-11 rounded-full bg-foreground text-background text-caption font-bold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 min-h-[44px] focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            برو به روز بعد
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  // The engine returns slots chronologically for calendar consistency. For the
  // recommendation group, surface the highest-scored choices first so the
  // hybrid optimizer is visible in the actual customer flow.
  const suggestedSlots = availableSlots
    .filter((s) => s.suggested)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.time.localeCompare(b.time));
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
        <div
          className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 cursor-pointer active:scale-[0.99] transition-transform"
          onClick={() => onSelectSlot(nextAvailable.time)}
        >
          <div>
            <p className="text-small font-bold text-primary">نزدیک‌ترین ساعت آزاد</p>
            <p className="text-small text-muted-foreground">برای رزرو سریع کلیک کنید</p>
          </div>
          <span className="text-body font-extrabold text-foreground">
            {toPersianDigits(nextAvailable.time)}
          </span>
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
                recommendation={slot.recommendation}
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
                recommendation={slot.recommendation}
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
  recommendation,
}: {
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: () => void;
  recommendation?: string;
}) {
  const formattedTime = slot.time.split(":").map((p) => toPersianDigits(p)).join(":");
  const isBooked = slot.booked || slot.locked;
  const isUnavailable = !slot.available && !isBooked;

  return (
    <button
      disabled={!slot.available}
      onClick={onSelect}
      aria-label={`${formattedTime} ${slot.available ? "موجود" : slot.booked ? "رزرو شده" : slot.locked ? "مسدود" : "غیرقابل رزرو"}${recommendation ? ` — ${recommendation}` : ""}`}
      title={recommendation}
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
