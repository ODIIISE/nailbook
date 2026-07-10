"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { getIranWeekDay } from "@/lib/slots";
import type { WorkingHours } from "@/lib/slots";

interface BlockTimeModalProps {
  date: Date;
  workingHours: WorkingHours;
  onBlock: (startTime: string, endTime: string, reason: string) => void;
  onCancel: () => void;
}

export function BlockTimeModal({ date, workingHours, onBlock, onCancel }: BlockTimeModalProps) {
  const defaultTimes = useMemo(() => {
    const dayKey = getIranWeekDay(date);
    const dayHours = workingHours[dayKey];
    if (dayHours) {
      // Default to midpoint of working hours
      const [openH, openM] = dayHours.open.split(":").map(Number);
      const [closeH, closeM] = dayHours.close.split(":").map(Number);
      const openMin = openH * 60 + openM;
      const closeMin = closeH * 60 + closeM;
      const midMin = Math.floor((openMin + closeMin) / 2);
      const midH = Math.floor(midMin / 60);
      const midM = midMin % 60;
      const endMin = midMin + 60;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      return {
        start: `${String(midH).padStart(2, "0")}:${String(midM).padStart(2, "0")}`,
        end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      };
    }
    return { start: "12:00", end: "13:00" };
  }, [date, workingHours]);

  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime && endTime) {
      onBlock(startTime, endTime, reason);
    }
  };

  return (
    <BottomSheet open={true} onClose={onCancel} title="مسدود کردن زمان">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="block-start" className="text-sm">از ساعت</Label>
            <Input
              id="block-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 text-center"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="block-end" className="text-sm">تا ساعت</Label>
            <Input
              id="block-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 text-center"
              dir="ltr"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="block-reason" className="text-sm">دلیل (اختیاری)</Label>
          <Input
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثلاً: استراحت ناهار"
            className="mt-1"
          />
        </div>
        <div className="flex gap-3">
          <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl">
            مسدود کن
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            انصراف
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
