"use client";

import { useMemo } from "react";
import type { Booking, Service } from "@/lib/mock-data";

interface TimelineProps {
  bookings: Array<Booking & { service?: Service }>;
  blockedTimes: Array<{ start_time: string; end_time: string }>;
  startHour?: number;
  endHour?: number;
}

export function Timeline({
  bookings,
  blockedTimes,
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

  const getBookingPosition = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = (startH - startHour) * 60 + startM;
    const endMinutes = (endH - startHour) * 60 + endM;
    const totalMinutes = (endHour - startHour) * 60;
    return {
      top: `${(startMinutes / totalMinutes) * 100}%`,
      height: `${((endMinutes - startMinutes) / totalMinutes) * 100}%`,
    };
  };

  return (
    <div className="relative" style={{ height: `${hours.length * 60}px` }}>
      {/* Hour markers */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border/30"
          style={{ top: `${((hour - startHour) / (endHour - startHour)) * 100}%` }}
        >
          <span className="absolute -top-3 -right-8 text-xs text-muted-foreground">
            {hour}:00
          </span>
        </div>
      ))}

      {/* Blocked times */}
      {blockedTimes.map((block, i) => {
        const pos = getBookingPosition(block.start_time, block.end_time);
        return (
          <div
            key={`block-${i}`}
            className="absolute left-12 right-4 bg-muted/50 rounded-lg border border-border/50"
            style={{ top: pos.top, height: pos.height }}
          >
            <div className="p-2 text-xs text-muted-foreground">مسدود</div>
          </div>
        );
      })}

      {/* Bookings */}
      {bookings.map((booking) => {
        const pos = getBookingPosition(booking.start_time, booking.end_time);
        return (
          <div
            key={booking.id}
            className="absolute left-12 right-4 bg-primary/10 rounded-lg border border-primary/30"
            style={{ top: pos.top, height: pos.height }}
          >
            <div className="p-2">
              <div className="text-sm font-bold text-foreground">
                {booking.customer_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {booking.service?.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
