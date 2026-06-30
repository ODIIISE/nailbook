"use client";

import { Card } from "@/components/ui/card";
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
      <Card className="mx-auto max-w-lg p-6 text-center">
        <p className="text-muted-foreground">ساعتی موجود نیست</p>
      </Card>
    );
  }

  const jalali = gregorianToJalali(date);

  return (
    <Card className="mx-auto max-w-lg p-4">
      <h3 className="font-semibold text-foreground mb-1">
        {formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd)}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">ساعت‌های موجود</p>

      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot) => (
          <button
            key={slot.time}
            disabled={!slot.available}
            onClick={() => slot.available && onSelectSlot(slot.time)}
            className={`
              h-12 rounded-lg text-sm font-medium transition-all
              ${selectedSlot === slot.time
                ? "bg-primary text-white shadow-md"
                : slot.available
                  ? "bg-secondary hover:bg-primary/10 text-foreground"
                  : "bg-muted text-muted-foreground/40 cursor-not-allowed line-through"
              }
            `}
          >
            {slot.time.split(":").map((p) => toPersianDigits(p)).join(":")}
          </button>
        ))}
      </div>
    </Card>
  );
}
