"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Ban, Clock } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { getTehranNow } from "@/lib/time";
import type { Booking, Service } from "@/lib/mock-data";

interface BlockedTime {
  date_gregorian: string;
  start_time: string;
  end_time: string;
}

interface TimelineProps {
  bookings: Array<Booking & { service?: Service }>;
  blockedTimes: BlockedTime[];
  paidBookings: Set<string>;
  onSelectBooking: (booking: Booking) => void;
  onRemoveBlock?: (index: number) => void;
  startHour?: number;
  endHour?: number;
}

const HOUR_HEIGHT = 64;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function Timeline({
  bookings,
  blockedTimes,
  paidBookings,
  onSelectBooking,
  onRemoveBlock,
  startHour = 9,
  endHour = 21,
}: TimelineProps) {
  const hours = useMemo(() => {
    const result = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  const totalHeight = hours.length * HOUR_HEIGHT;

  const getBlockStyle = (startTime: string, endTime: string) => {
    const startMin = timeToMinutes(startTime) - startHour * 60;
    const endMin = timeToMinutes(endTime) - startHour * 60;
    const top = (startMin / 60) * HOUR_HEIGHT;
    const height = Math.max(((endMin - startMin) / 60) * HOUR_HEIGHT, 24);
    return { top, height };
  };

  const now = getTehranNow();
  const currentMinute = now.minutes;
  const showCurrentTime = currentMinute >= startHour * 60 && currentMinute <= endHour * 60;

  return (
    <Card className="overflow-hidden">
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour markers */}
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

        {/* Bookings */}
        {bookings.map((booking) => {
          const style = getBlockStyle(booking.start_time, booking.end_time);
          const price = booking.service?.price || 0;
          return (
            <div
              key={booking.id}
              className="absolute right-14 left-2 cursor-pointer z-10"
              style={{ top: style.top, height: style.height }}
              onClick={() => onSelectBooking(booking)}
            >
              <div className="h-full rounded-md bg-primary/10 border border-primary/30 p-1.5 hover:bg-primary/15 transition-colors overflow-hidden">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-2.5 w-2.5 text-primary shrink-0" />
                    <span className="text-[10px] font-semibold text-primary truncate">
                      {booking.customer_name}
                    </span>
                  </div>
                  <Badge
                    variant={paidBookings.has(booking.id) ? "default" : "secondary"}
                    className={`text-[8px] px-1 py-0 h-3.5 ${paidBookings.has(booking.id) ? "bg-success text-white" : "bg-destructive/10 text-destructive"}`}
                  >
                    {paidBookings.has(booking.id) ? "پرداخت شده" : "پرداخت نشده"}
                  </Badge>
                </div>
                <p className="text-[9px] text-primary/70 truncate">
                  {booking.service?.name}
                </p>
                {style.height > 40 && (
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[9px] text-primary/50">
                      {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                    </p>
                    <p className="text-[9px] font-bold text-primary/70">
                      {toPersianDigits(price.toLocaleString("fa-IR"))}
                    </p>
                  </div>
                )}
                {style.height > 55 && (
                  <p className="text-[8px] text-primary/40 mt-0.5">
                    {toPersianDigits(booking.service?.duration_minutes || 0)} دقیقه
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Blocked times */}
        {blockedTimes.map((block, index) => {
          const style = getBlockStyle(block.start_time, block.end_time);
          return (
            <div
              key={`block-${index}`}
              className="absolute right-14 left-2 cursor-pointer z-10"
              style={{ top: style.top, height: style.height }}
              onClick={() => onRemoveBlock?.(index)}
            >
              <div className="h-full rounded-lg bg-amber-50 border border-amber-300/50 p-2 hover:bg-amber-100 transition-colors overflow-hidden">
                <div className="flex items-center gap-1 mb-0.5">
                  <Ban className="h-3 w-3 text-amber-600 shrink-0" />
                  <span className="text-xs font-semibold text-amber-800 truncate">
                    استراحت
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

        {/* Current time indicator */}
        {showCurrentTime && (
          <div
            className="absolute right-14 left-2 h-[2px] bg-primary z-20 pointer-events-none"
            style={{
              top: ((currentMinute - startHour * 60) / 60) * HOUR_HEIGHT,
            }}
          />
        )}
      </div>

      {/* Empty state */}
      {bookings.length === 0 && blockedTimes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-muted-foreground text-sm">برنامه‌ای برای این روز ثبت نشده</p>
          </div>
        </div>
      )}
    </Card>
  );
}
