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
      <div className="mx-auto max-w-lg glass rounded-3xl p-8 text-center shadow-card">
        <Clock className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-[15px] text-muted-foreground">تاریخ را انتخاب کنید</p>
      </div>
    );
  }

  const availableSlots = slots.filter((s) => s.available);

  if (availableSlots.length === 0) {
    return (
      <div className="mx-auto max-w-lg glass rounded-3xl p-8 text-center shadow-card">
        <Ban className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-[15px] text-muted-foreground">ساعتی موجود نیست</p>
        <p className="text-[13px] text-muted-foreground/50 mt-1">تاریخ دیگری انتخاب کنید</p>

        {onGoToNextDay && (
          <button
            onClick={onGoToNextDay}
            className="mt-4 w-full h-10 rounded-full bg-foreground text-background text-[13px] font-bold hover:bg-foreground/90 transition-colors flex items-center justify-center gap-2"
          >
            روز بعد
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  const suggestedSlots = availableSlots.filter((s) => s.suggested);
  const otherSlots = availableSlots.filter((s) => !s.suggested);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-foreground" />
            <span className="text-[13px] text-muted-foreground">موجود</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white/30" />
            <span className="text-[13px] text-muted-foreground">رزرو شده</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-destructive/50" />
            <span className="text-[13px] text-muted-foreground">غیرفعال</span>
          </div>
        </div>
        <span className="text-[13px] text-muted-foreground">
          {toPersianDigits(availableSlots.length)} موجود
        </span>
      </div>

      {suggestedSlots.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[13px] font-bold text-primary">زمان‌های پیشنهادی</span>
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

      {otherSlots.length > 0 && (
        <div>
          {suggestedSlots.length > 0 && (
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-[13px] text-muted-foreground">ساعت‌های دیگر</span>
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

  return (
    <button
      disabled={!slot.available}
      onClick={onSelect}
      aria-label={`${formattedTime} ${slot.available ? "موجود" : "رزرو شده"}`}
      className={`
        h-11 rounded-full text-[13px] font-bold transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none
        ${isSelected
          ? "bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
          : slot.available
            ? "glass hover:bg-white/60 text-foreground active:scale-95 cursor-pointer"
            : "bg-white/20 text-muted-foreground/40 cursor-not-allowed line-through"
        }
      `}
    >
      {formattedTime}
    </button>
  );
}
