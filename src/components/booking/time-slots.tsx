"use client";

import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { toPersianDigits, formatJalaliDateShort, gregorianToJalali } from "@/lib/jalali";
import type { TimeSlot } from "@/lib/slots";

interface TimeSlotsProps {
  date: Date;
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (time: string) => void;
}

export function TimeSlots({ date, slots, selectedSlot, onSelectSlot }: TimeSlotsProps) {
  if (slots.length === 0) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-body text-muted-foreground">ساعتی موجود نیست</p>
        <p className="text-caption text-muted-foreground/60 mt-1">تاریخ دیگری انتخاب کنید</p>
      </Card>
    );
  }

  const jalali = gregorianToJalali(date);
  const availableCount = slots.filter((s) => s.available).length;

  return (
    <Card className="mx-auto max-w-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-h3 text-foreground">
            {formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd)}
          </h3>
          <p className="text-caption text-muted-foreground mt-0.5">
            {toPersianDigits(availableCount)} ساعت موجود
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 animate-stagger">
        {slots.map((slot) => {
          const formattedTime = slot.time.split(":").map((p) => toPersianDigits(p)).join(":");
          return (
            <button
              key={slot.time}
              disabled={!slot.available}
              onClick={() => slot.available && onSelectSlot(slot.time)}
              aria-label={`${formattedTime} ${slot.available ? "" : "- غیرفعال"}`}
              className={`
                h-12 rounded-xl text-body font-medium transition-all duration-150
                focus-visible:ring-3 focus-visible:ring-primary/50 focus-visible:outline-none
                ${selectedSlot === slot.time
                  ? "bg-primary text-white shadow-md scale-105"
                  : slot.available
                    ? "bg-muted hover:bg-primary/10 text-foreground active:scale-95"
                    : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed line-through"
                }
              `}
            >
              {formattedTime}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
