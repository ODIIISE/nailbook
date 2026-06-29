"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BlockTimeModalProps {
  date: Date;
  onBlock: (startTime: string, endTime: string, reason: string) => void;
  onCancel: () => void;
}

export function BlockTimeModal({ date, onBlock, onCancel }: BlockTimeModalProps) {
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime && endTime) {
      onBlock(startTime, endTime, reason);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-foreground mb-4">مسدود کردن زمان</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="block-start" className="text-sm">از ساعت</Label>
            <Input
              id="block-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="block-end" className="text-sm">تا ساعت</Label>
            <Input
              id="block-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1"
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
          <Button type="submit" className="flex-1 bg-rose hover:bg-rose/90 text-white">
            مسدود کن
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            انصراف
          </Button>
        </div>
      </form>
    </Card>
  );
}
