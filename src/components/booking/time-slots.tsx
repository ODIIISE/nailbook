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
        <p className="text-[15px] text-muted-foreground">تاریخ را انتخاب کنید</p>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);
  const bookedSlots = slots.filter((s) => !s.available && (s.booked || s.locked));
  const unavailableSlots = slots.filter((s) => !s.available && !s.booked && !s.locked);

  if (slots.length === 0) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="glass rounded-3xl overflow-hidden shadow-card">
          <div className="px-6 pt-9 pb-7 text-center">
            <div className="relative mx-auto mb-5 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-muted/70" />
              <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center shadow-card">
                <CalendarOff className="h-8 w-8 text-muted-foreground/70" />
              </div>
            </div>
            <h3 className="text-h3 font-bold text-foreground">ساعتی برای این روز نیست</h3>
            <p className="text-[13px] text-muted-foreground mt-2 leading-6">
              این روز ساعات کاری ندارد — روز بعد را امتحان کنید
            </p>
          </div>
          {onGoToNextDay && (
            <div className="px-6 pb-6">
              <button
                onClick={() => {
                  haptic.tap();
                  onGoToNextDay();
                }}
                className="w-full h-12 rounded-full bg-foreground text-background text-[14px] font-bold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 min-h-[44px] focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                برو به روز بعد
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const suggestedSlots = availableSlots.filter((s) => s.suggested);
  const otherSlots = availableSlots.filter((s) => !s.suggested);
  const nextAvailable = availableSlots.length > 0 ? availableSlots[0] : null;
  const remainingSlots = availableSlots.length;

  // All slots booked — beautiful "day is full" empty state
  if (availableSlots.length === 0 && slots.length > 0) {
    const chipTimes = bookedSlots.slice(0, 6).map((s) => s.time);
    return (
      <div className="mx-auto max-w-lg">
        <div className="glass rounded-3xl overflow-hidden shadow-card">
          {/* Hatched accent band — everything is taken */}
          <div
            className="h-1.5"
            style={{
              background:
                "repeating-linear-gradient(-45deg, var(--muted-foreground) 0 2px, transparent 2px 6px)",
              opacity: 0.3,
            }}
          />
          <div className="px-6 pt-8 pb-5 text-center">
            <div className="relative mx-auto mb-5 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-primary/5" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1.5px dashed color-mix(in oklab, var(--primary) 35%, transparent)",
                }}
              />
              <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center shadow-card">
                <CalendarX2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-h3 font-bold text-foreground">این روز کاملاً پر شده</h3>
            <p className="text-[13px] text-muted-foreground mt-2 max-w-xs mx-auto leading-6">
              همه ساعت‌ها رزرو شده‌اند — فردا را امتحان کنید
            </p>
          </div>

          {/* Mini hatched chips — visual proof the day is packed */}
          {chipTimes.length > 0 && (
            <div className="px-8 pb-5">
              <div className="grid grid-cols-3 gap-2">
                {chipTimes.map((t) => (
                  <div
                    key={t}
                    className="relative h-9 rounded-lg border border-border overflow-hidden flex items-center justify-center"
                  >
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "repeating-linear-gradient(-45deg, transparent, transparent 2px, var(--muted-foreground) 2px, var(--muted-foreground) 4px)",
                        opacity: 0.15,
                      }}
                    />
                    <span className="relative z-10 text-[11px] font-bold tabular-nums text-muted-foreground">
                      {toPersianDigits(t.slice(0, 5))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-6 pb-6 space-y-2">
            {onGoToNextDay && (
              <button
                onClick={() => {
                  haptic.tap();
                  onGoToNextDay();
                }}
                className="w-full h-12 rounded-full bg-foreground text-background text-[14px] font-bold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2 min-h-[44px] focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
              >
                برو به فردا
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <p className="text-[11px] text-muted-foreground/70 text-center">
              یا تاریخ دیگری از تقویم انتخاب کنید
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Legend + remaining count */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" />
            <span className="text-[13px] text-muted-foreground">موجود</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-hatched" />
            <span className="text-[13px] text-muted-foreground">رزرو شده</span>
          </div>
        </div>
        <span className="text-[13px] font-bold text-foreground">
          {toPersianDigits(remainingSlots)} ساعت خالی
        </span>
      </div>

      {nextAvailable && (
        <div
          className="relative overflow-hidden rounded-xl border border-primary/15 bg-primary/5 p-3.5 flex items-center gap-3"
          role="note"
        >
          {/* Soft glow accent */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(120px 60px at 12% 50%, color-mix(in oklab, var(--primary) 10%, transparent), transparent 70%)",
            }}
          />
          <div className="relative shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/10 motion-reduce:animate-none" />
          </div>
          <div className="relative flex-1 min-w-0">
            <p className="text-[12px] font-bold text-primary">نزدیک‌ترین ساعت آزاد</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              اولین زمان موجود — ساعت {toPersianDigits(nextAvailable.time)} را از پایین انتخاب کنید
            </p>
          </div>
          <span className="relative shrink-0 text-[16px] font-extrabold tabular-nums text-foreground">
            {toPersianDigits(nextAvailable.time)}
          </span>
        </div>
      )}

      {/* Suggested slots */}
      {suggestedSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[13px] font-bold text-primary">ساعت‌های پیشنهادی</span>
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
              <span className="text-[13px] text-muted-foreground">ساعت‌های دیگر</span>
            </div>
          )}
          {suggestedSlots.length === 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[13px] text-muted-foreground">ساعت‌های موجود</span>
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
            <span className="text-[13px] text-muted-foreground">ساعت‌های رزرو شده</span>
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
            <span className="text-[13px] text-muted-foreground">ساعت‌های غیرقابل رزرو</span>
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
      className="h-[48px] min-h-[44px] rounded-xl text-[13px] font-bold transition-all duration-200 select-none relative overflow-hidden focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none"
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
