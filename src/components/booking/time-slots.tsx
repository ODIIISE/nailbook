"use client";

import { Clock, Ban } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { TimeSlot } from "@/lib/slots";

interface TimeSlotsProps {
  date: Date | null;
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
}

export function TimeSlots({ date, slots, selectedSlot, onSelectSlot }: TimeSlotsProps) {
  if (!date) {
    return (
      <div className="mx-auto max-w-lg glass rounded-3xl p-8 text-center">
        <Clock className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-[15px] text-muted-foreground">تاریخ را انتخاب کنید</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="mx-auto max-w-lg glass rounded-3xl p-8 text-center">
        <Ban className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-[15px] text-muted-foreground">ساعتی موجود نیست</p>
        <p className="text-[13px] text-muted-foreground/50 mt-1">تاریخ دیگری انتخاب کنید</p>
      </div>
    );
  }

  const availableCount = slots.filter((s) => s.available).length;

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between mb-3 px-1">
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
          {toPersianDigits(availableCount)} موجود
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 animate-stagger">
        {slots.map((slot) => {
          const formattedTime = slot.time.split(":").map((p) => toPersianDigits(p)).join(":");
          const isSelected = selectedSlot === slot.time;
          const isFree = slot.available && !isSelected;
          const isTaken = slot.booked;
          const isLocked = slot.locked;

          return (
            <button
              key={slot.time}
              disabled={!slot.available}
              onClick={() => slot.available && onSelectSlot(slot.time)}
              aria-label={`${formattedTime} ${isFree ? "موجود" : isTaken ? "رزرو شده" : isLocked ? "قفل شده" : ""}`}
              className={`
                h-11 rounded-full text-[13px] font-bold transition-all duration-200
                focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:outline-none
                ${isSelected
                  ? "bg-foreground text-background shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
                  : isFree
                    ? "glass hover:bg-white/60 text-foreground active:scale-95 cursor-pointer"
                    : isTaken
                      ? "bg-white/20 text-muted-foreground/40 cursor-not-allowed line-through"
                      : "bg-destructive/10 text-destructive/40 cursor-not-allowed"
                }
              `}
            >
              {formattedTime}
            </button>
          );
        })}
      </div>
    </div>
  );
}
