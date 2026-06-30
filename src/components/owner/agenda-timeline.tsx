"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Clock, User, Ban } from "lucide-react";
import { toPersianDigits, formatJalaliDate, gregorianToJalali } from "@/lib/jalali";
import type { Booking } from "@/lib/mock-data";

interface BlockedTime {
  id: string;
  date_gregorian: string;
  start_time: string;
  end_time: string;
  reason: string;
}

interface AgendaTimelineProps {
  bookings: Booking[];
  blockedTimes: BlockedTime[];
  date: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectBooking: (booking: Booking) => void;
  onRemoveBlock: (id: string) => void;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const HOUR_HEIGHT = 64;
const START_HOUR = 8;
const END_HOUR = 20;

export function AgendaTimeline({
  bookings,
  blockedTimes,
  date,
  onPrevDay,
  onNextDay,
  onSelectBooking,
  onRemoveBlock,
}: AgendaTimelineProps) {
  const jalali = gregorianToJalali(date);
  const formattedDate = formatJalaliDate(jalali.jy, jalali.jm, jalali.jd);

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

  const totalHeight = hours.length * HOUR_HEIGHT;

  const getBlockStyle = (startTime: string, endTime: string) => {
    const startMin = timeToMinutes(startTime) - START_HOUR * 60;
    const endMin = timeToMinutes(endTime) - START_HOUR * 60;
    const top = (startMin / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);
    return { top, height };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={onPrevDay}>
          <ChevronRight className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-semibold text-foreground">{formattedDate}</p>
          <p className="text-xs text-muted-foreground">
            {toPersianDigits(bookings.length)} نوبت · {toPersianDigits(blockedTimes.length)} استراحت
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onNextDay}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="absolute w-full border-t border-border/50"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <span className="absolute -top-3 right-0 text-[10px] text-muted-foreground font-mono bg-card px-1">
                {String(hour).padStart(2, "0")}:00
              </span>
            </div>
          ))}

          {bookings.map((booking) => {
            const style = getBlockStyle(booking.start_time, booking.end_time);
            return (
              <div
                key={booking.id}
                className="absolute right-14 left-2 cursor-pointer z-10"
                style={{ top: style.top, height: style.height }}
                onClick={() => onSelectBooking(booking)}
              >
                <div className="h-full rounded-lg bg-primary/10 border border-primary/30 p-2 hover:bg-primary/15 transition-colors overflow-hidden">
                  <div className="flex items-center gap-1 mb-0.5">
                    <User className="h-3 w-3 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-primary truncate">
                      {booking.customer_name}
                    </span>
                  </div>
                  <p className="text-[10px] text-primary/70 truncate">
                    {booking.service?.name}
                  </p>
                  {style.height > 40 && (
                    <p className="text-[10px] text-primary/50 mt-0.5">
                      {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {blockedTimes.map((block) => {
            const style = getBlockStyle(block.start_time, block.end_time);
            return (
              <div
                key={block.id}
                className="absolute right-14 left-2 cursor-pointer z-10"
                style={{ top: style.top, height: style.height }}
                onClick={() => onRemoveBlock(block.id)}
              >
                <div className="h-full rounded-lg bg-amber-50 border border-amber-300/50 p-2 hover:bg-amber-100 transition-colors overflow-hidden">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Ban className="h-3 w-3 text-amber-600 shrink-0" />
                    <span className="text-xs font-semibold text-amber-800 truncate">
                      {block.reason}
                    </span>
                  </div>
                  {style.height > 30 && (
                    <p className="text-[10px] text-amber-600">
                      {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                    </p>
                  )}
                  {style.height > 50 && (
                    <p className="text-[10px] text-amber-500 mt-0.5">
                      حذف: کلیک کنید
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <div
            className="absolute right-14 left-2 h-[2px] bg-primary z-20 pointer-events-none"
            style={{
              top: ((new Date().getHours() * 60 + new Date().getMinutes() - START_HOUR * 60) / 60) * HOUR_HEIGHT,
            }}
          />
        </div>
      </Card>

      {bookings.length === 0 && blockedTimes.length === 0 && (
        <Card className="p-8 text-center mt-4">
          <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-muted-foreground">برنامه‌ای برای این روز ثبت نشده</p>
        </Card>
      )}
    </div>
  );
}
