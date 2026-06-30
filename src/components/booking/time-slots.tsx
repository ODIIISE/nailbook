"use client";

import { Card } from "@/components/ui/card";
import { Clock, Ban, Check } from "lucide-react";
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
      <Card className="mx-auto max-w-lg p-8 text-center">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-body text-muted-foreground">تاریخ را انتخاب کنید</p>
      </Card>
    );
  }

  if (slots.length === 0) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <Ban className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-body text-muted-foreground">ساعتی موجود نیست</p>
        <p className="text-caption text-muted-foreground/50 mt-1">تاریخ دیگری انتخاب کنید</p>
      </Card>
    );
  }

  const availableCount = slots.filter((s) => s.available).length;
  const takenCount = slots.filter((s) => s.booked).length;

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-caption text-muted-foreground"> موجود</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
            <span className="text-caption text-muted-foreground">رزرو شده</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
            <span className="text-caption text-muted-foreground">غیرفعال</span>
          </div>
        </div>
        <span className="text-caption text-muted-foreground">
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
                relative h-14 rounded-xl text-sm font-medium transition-all duration-150 flex flex-col items-center justify-center gap-0.5
                focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:outline-none
                ${isSelected
                  ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/30"
                  : isFree
                    ? "bg-card border border-primary/20 text-foreground hover:bg-primary/5 hover:border-primary/40 active:scale-95 cursor-pointer shadow-[var(--shadow-card)]"
                    : isTaken
                      ? "bg-muted/60 text-muted-foreground/50 cursor-not-allowed line-through"
                      : "bg-destructive/5 text-destructive/40 cursor-not-allowed border border-destructive/10"
                }
              `}
            >
              <span className="text-sm font-semibold">{formattedTime}</span>
              {isSelected && (
                <Check className="h-3 w-3 text-white" />
              )}
              {isTaken && !isSelected && (
                <span className="text-[9px] text-muted-foreground/40">رزرو شده</span>
              )}
              {isLocked && !isSelected && (
                <span className="text-[9px] text-destructive/40">قفل</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
