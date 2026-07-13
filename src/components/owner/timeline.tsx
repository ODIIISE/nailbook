"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { User, Ban, Clock, Check, Wallet } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDateShort } from "@/lib/jalali";
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

// Earth tone palette — one color per service
const SERVICE_COLORS = [
  { bg: "#F5E6E0", border: "#D4A08A", text: "#8B4513", badge: "bg-[#D4A08A] text-white" },   // terracotta
  { bg: "#E8EDE5", border: "#A8B89C", text: "#4A5D3E", badge: "bg-[#A8B89C] text-white" },   // sage
  { bg: "#F0E6D3", border: "#C4A97D", text: "#6B5B3E", badge: "bg-[#C4A97D] text-white" },   // sand
  { bg: "#E0E4E8", border: "#8E9AAB", text: "#3D4F5F", badge: "bg-[#8E9AAB] text-white" },   // slate
  { bg: "#EDE5E0", border: "#B8967A", text: "#6B4226", badge: "bg-[#B8967A] text-white" },   // clay
  { bg: "#E5EBE5", border: "#7A9A7A", text: "#2D5A2D", badge: "bg-[#7A9A7A] text-white" },   // forest
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
            {/* Booking blocks */}
            {bookings.map((booking) => {
              const pos = getBlockPosition(booking.start_time, booking.end_time, startHour);
              const price = Number(booking.service?.price) || 0;
              const colorIdx = serviceIndexMap.get(booking.service_id) ?? 0;
              const color = getServiceColor(colorIdx);
              const jalali = gregorianToJalali(new Date(booking.date_gregorian.split("T")[0]));

              return (
                <div
                  key={booking.id}
                  className="absolute right-14 left-2 cursor-pointer z-10"
                  style={{ top: pos.top, height: pos.height }}
                  onClick={() => onSelectBooking(booking)}
                >
                  <div
                    className="h-full border p-2.5 hover:brightness-95 transition-all overflow-hidden relative"
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border,
                      borderRightWidth: "4px",
                      borderRightColor: color.border,
                      borderRadius: 0,
                    }}
                  >
                    {/* Row 1: Name + Jalali date */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-bold truncate" style={{ color: color.text }}>
                        {booking.customer_name}
                      </span>
                      {pos.height > 50 && (
                        <span className="text-[9px] shrink-0 ml-1" style={{ color: color.text, opacity: 0.5 }}>
                          {formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd)}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Service + Time */}
                    {pos.height > 36 && (
                      <p className="text-[10px] truncate mb-1.5" style={{ color: color.text, opacity: 0.7 }}>
                        {booking.service?.name} · {booking.start_time.slice(0, 5)} تا {booking.end_time.slice(0, 5)}
                      </p>
                    )}

                    {/* Row 3: Stats pills */}
                    {pos.height > 55 && (
                      <div className="flex gap-1 flex-wrap">
                        {/* Duration pill */}
                        <div
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: `${color.border}20` }}
                        >
                          <Clock className="h-2.5 w-2.5" style={{ color: color.text, opacity: 0.6 }} />
                          <span className="text-[8px]" style={{ color: color.text, opacity: 0.7 }}>
                            {toPersianDigits(pos.durationMinutes)} دقیقه
                          </span>
                        </div>

                        {/* Payment pill */}
                        <div
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: booking.paid ? "#dcfce7" : "#fef2f2" }}
                        >
                          <Check className="h-2.5 w-2.5" style={{ color: booking.paid ? "#166534" : "#dc2626" }} />
                          <span
                            className="text-[8px] font-medium"
                            style={{ color: booking.paid ? "#166534" : "#dc2626" }}
                          >
                            {booking.paid ? "پرداخت" : "پرداخت نشده"}
                          </span>
                        </div>

                        {/* Price pill */}
                        {pos.height > 70 && (
                          <div
                            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: `${color.border}20` }}
                          >
                            <Wallet className="h-2.5 w-2.5" style={{ color: color.text, opacity: 0.6 }} />
                            <span className="text-[8px] font-semibold" style={{ color: color.text }}>
                              {formatPrice(price)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
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
                  <div className="h-full bg-amber-50 border border-amber-300/50 p-2 hover:bg-amber-100 transition-colors overflow-hidden" style={{ borderRadius: 0, borderRightWidth: "4px", borderRightColor: "#f59e0b" }}>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Ban className="h-3 w-3 text-amber-600 shrink-0" />
                      <span className="text-xs font-semibold text-amber-800 truncate">استراحت</span>
                    </div>
                    {pos.height > 30 && (
                      <p className="text-[10px] text-amber-600">
                        {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                      </p>
                    )}
                    {pos.height > 50 && (
                      <p className="text-[10px] text-amber-500 mt-0.5">حذف: کلیک کنید</p>
                    )}
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
