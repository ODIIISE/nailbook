"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { User, Ban, Clock, CreditCard } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { getTehranNow } from "@/lib/time";
import type { Booking, Service } from "@/lib/types";

interface BlockedTime {
  date_gregorian: string;
  start_time: string;
  end_time: string;
}

interface TimelineProps {
  bookings: Array<Booking & { service?: Service }>;
  blockedTimes: BlockedTime[];
  onSelectBooking: (booking: Booking) => void;
  onRemoveBlock?: (index: number) => void;
  startHour?: number;
  endHour?: number;
}

const HOUR_HEIGHT = 64;

// Service-colored accent strokes — one color per service
const SERVICE_COLORS = [
  "#D4A08A", // terracotta
  "#A8B89C", // sage
  "#C4A97D", // sand
  "#8E9AAB", // slate
  "#B8967A", // clay
  "#7A9A7A", // forest
];

function getServiceColor(index: number) {
  return SERVICE_COLORS[index % SERVICE_COLORS.length];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  return String(hour).padStart(2, "0") + ":00";
}

function getBlockPosition(
  startTime: string,
  endTime: string,
  startHour: number
): { top: number; height: number; durationMinutes: number } {
  const start = timeToMinutes(startTime) - startHour * 60;
  const end = timeToMinutes(endTime) - startHour * 60;
  return {
    top: (start / 60) * HOUR_HEIGHT,
    height: Math.max(((end - start) / 60) * HOUR_HEIGHT, 24),
    durationMinutes: timeToMinutes(endTime) - timeToMinutes(startTime),
  };
}

export function Timeline({
  bookings,
  blockedTimes,
  onSelectBooking,
  onRemoveBlock,
  startHour = 8,
  endHour = 22,
}: TimelineProps) {
  const totalHours = endHour - startHour;
  const totalHeight = totalHours * HOUR_HEIGHT;

  const hourMarks = useMemo(
    () => Array.from({ length: totalHours + 1 }, (_, i) => startHour + i),
    [startHour, totalHours]
  );

  const now = getTehranNow();
  const currentMinute = now.minutes;
  const showNow = currentMinute >= startHour * 60 && currentMinute <= endHour * 60;
  const nowPosition = showNow ? ((currentMinute - startHour * 60) / 60) * HOUR_HEIGHT : 0;

  const hasContent = bookings.length > 0 || blockedTimes.length > 0;

  // Build service index map for consistent colors
  const serviceIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const b of bookings) {
      const sid = b.service_id;
      if (!map.has(sid)) map.set(sid, idx++);
    }
    return map;
  }, [bookings]);

  return (
    <Card className="overflow-hidden">
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour grid lines */}
        {hourMarks.map((hour, i) => (
          <div
            key={`hour-${hour}`}
            className="absolute w-full border-t border-border/50"
            style={{ top: i * HOUR_HEIGHT }}
          >
            <span className="absolute -top-3 right-0 text-[10px] text-muted-foreground font-mono bg-card px-1">
              {formatHour(hour)}
            </span>
          </div>
        ))}

        {/* Half-hour dashed lines */}
        {hourMarks.slice(0, -1).map((hour, i) => (
          <div
            key={`half-${hour}`}
            className="absolute w-full border-t border-dashed border-border/25"
            style={{ top: (i + 0.5) * HOUR_HEIGHT }}
          />
        ))}

        {hasContent ? (
          <>
            {/* Booking blocks — Task-card pattern */}
            {bookings.map((booking) => {
              const pos = getBlockPosition(booking.start_time, booking.end_time, startHour);
              const price = Number(booking.service?.price) || 0;
              const colorIdx = serviceIndexMap.get(booking.service_id) ?? 0;
              const accentColor = getServiceColor(colorIdx);
              const isLong = pos.height >= 60; // 60+ min = long variant

              return (
                <div
                  key={booking.id}
                  className="absolute right-14 left-2 cursor-pointer z-10"
                  style={{ top: pos.top, height: pos.height }}
                  onClick={() => onSelectBooking(booking)}
                >
                  <div className="h-full bg-white border border-black/[0.06] overflow-hidden flex">
                    {/* Right accent stroke (RTL: right side) */}
                    <div
                      className="w-[3px] shrink-0"
                      style={{ backgroundColor: accentColor }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0 p-2">
                      {/* Title: Customer name (king) */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[13px] font-extrabold text-black truncate leading-tight">
                          {booking.customer_name}
                        </span>
                        {booking.paid && (
                          <CreditCard className="h-3 w-3 shrink-0 text-[#28A745]" />
                        )}
                      </div>

                      {/* Subtitle: Service + Time */}
                      <p className="text-[10px] text-black/50 font-medium mt-0.5 truncate">
                        {booking.service?.name} · {booking.start_time.slice(0, 5)}-{booking.end_time.slice(0, 5)}
                      </p>

                      {/* Stats row (if tall enough) */}
                      {isLong && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5 text-black/30" />
                            <span className="text-[9px] text-black/40 font-medium">
                              {toPersianDigits(pos.durationMinutes)} دقیقه
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <span className="text-[9px] text-black/40 font-bold">
                              {formatPrice(price)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Blocked time blocks */}
            {blockedTimes.map((block, index) => {
              const pos = getBlockPosition(block.start_time, block.end_time, startHour);
              return (
                <div
                  key={`block-${index}`}
                  className="absolute right-14 left-2 cursor-pointer z-10"
                  style={{ top: pos.top, height: pos.height }}
                  onClick={() => onRemoveBlock?.(index)}
                >
                  <div className="h-full bg-[#FFF8E1] border border-[#FFD54F]/40 overflow-hidden flex">
                    {/* Right accent stroke */}
                    <div className="w-[3px] shrink-0 bg-[#FFB300]" />

                    <div className="flex-1 min-w-0 p-2">
                      <div className="flex items-center gap-1">
                        <Ban className="h-3 w-3 text-[#F57F17] shrink-0" />
                        <span className="text-[11px] font-bold text-[#E65100] truncate">استراحت</span>
                      </div>
                      {pos.height > 30 && (
                        <p className="text-[9px] text-[#F57F17]/70 mt-0.5">
                          {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                        </p>
                      )}
                      {pos.height > 50 && (
                        <p className="text-[8px] text-[#F57F17]/50 mt-0.5">حذف: کلیک کنید</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Current time line */}
            {showNow && (
              <div
                className="absolute right-14 left-2 h-[2px] bg-primary z-20 pointer-events-none"
                style={{ top: nowPosition }}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center opacity-40">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-[15px]">برنامه‌ای برای این روز ثبت نشده</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
