"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { User, Ban, Clock, CreditCard, CheckCircle2, Loader, XCircle, Layers, DollarSign } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { getTehranNow } from "@/lib/time";
import type { Booking, Service, Addon } from "@/lib/types";

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
  addons?: Addon[];
  startHour?: number;
  endHour?: number;
}

const HOUR_HEIGHT = 64;

// Fixed color palette — from homepage service card gradients
const SERVICE_PALETTE = [
  { accent: "#FDA4AF", bg: "#FFF5F6" }, // rose
  { accent: "#FCD34D", bg: "#FFFCF0" }, // amber
  { accent: "#6EE7B7", bg: "#F0FDF8" }, // emerald
  { accent: "#93C5FD", bg: "#F0F7FF" }, // blue
  { accent: "#C4B5FD", bg: "#F5F3FF" }, // purple
];

// Status config
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: typeof CheckCircle2; dotColor: string }> = {
  confirmed: { label: "تایید شده", bg: "#E8F5E9", color: "#2E7D32", icon: CheckCircle2, dotColor: "#2E7D32" },
  in_progress: { label: "در حال انجام", bg: "#E3F2FD", color: "#1565C0", icon: Loader, dotColor: "#1565C0" },
  completed: { label: "تکمیل شده", bg: "#F3E5F5", color: "#7B1FA2", icon: CheckCircle2, dotColor: "#7B1FA2" },
  cancelled: { label: "لغو شده", bg: "#FFEBEE", color: "#C62828", icon: XCircle, dotColor: "#C62828" },
  pending: { label: "در انتظار", bg: "#FFF3E0", color: "#E65100", icon: Clock, dotColor: "#E65100" },
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getServiceStyle(serviceId: string) {
  const idx = hashString(serviceId) % SERVICE_PALETTE.length;
  return SERVICE_PALETTE[idx];
}

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHourPersian(hour: number): string {
  return toPersianDigits(String(hour).padStart(2, "0") + ":00");
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

function computeBookingTotal(
  booking: Booking,
  service?: Service,
  addons?: Addon[]
): { totalPrice: number; totalDuration: number; hasAddons: boolean } {
  const servicePrice = Number(service?.price) || 0;
  const selectedAddons = booking.selected_addons || [];
  const addonsPrice = selectedAddons.reduce((sum, addonId) => {
    const addon = addons?.find((a) => a.id === addonId);
    return sum + (Number(addon?.price) || 0);
  }, 0);
  return {
    totalPrice: servicePrice + addonsPrice,
    totalDuration: getBlockPosition(booking.start_time, booking.end_time, 0).durationMinutes,
    hasAddons: selectedAddons.length > 0,
  };
}

export function Timeline({
  bookings,
  blockedTimes,
  onSelectBooking,
  onRemoveBlock,
  addons = [],
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

  return (
    <Card className="overflow-hidden py-4">
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour grid lines */}
        {hourMarks.map((hour, i) => (
          <div
            key={`hour-${hour}`}
            className="absolute w-full border-t border-border/60"
            style={{ top: i * HOUR_HEIGHT }}
          >
            <span className="absolute -top-3.5 right-0 text-[12px] font-bold text-black/50 font-mono bg-card px-1.5">
              {formatHourPersian(hour)}
            </span>
          </div>
        ))}

        {/* Half-hour dashed lines */}
        {hourMarks.slice(0, -1).map((hour, i) => (
          <div
            key={`half-${hour}`}
            className="absolute w-full border-t border-dashed border-black/10"
            style={{ top: (i + 0.5) * HOUR_HEIGHT }}
          />
        ))}

        {hasContent ? (
          <>
            {/* Booking blocks */}
            {bookings.map((booking) => {
              const pos = getBlockPosition(booking.start_time, booking.end_time, startHour);
              const { totalPrice, totalDuration, hasAddons } = computeBookingTotal(booking, booking.service, addons);
              const style = getServiceStyle(booking.service_id);
              const statusCfg = getStatusConfig(booking.status);
              const StatusIcon = statusCfg.icon;
              const isCompact = pos.height < 60;

              if (isCompact) {
                // ─── Compact variant ───
                return (
                  <div
                    key={booking.id}
                    className="absolute right-14 left-2 cursor-pointer z-10"
                    style={{ top: pos.top, height: pos.height }}
                    onClick={() => onSelectBooking(booking)}
                  >
                    <div
                      className="h-full border border-black/[0.06] overflow-hidden flex items-stretch"
                      style={{ backgroundColor: style.bg }}
                    >
                      <div className="w-[3px] shrink-0" style={{ backgroundColor: style.accent }} />

                      <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
                        {/* Name */}
                        <div className="flex items-center gap-1 min-w-0 shrink">
                          <User className="h-[11px] w-[11px] shrink-0 text-black/30" />
                          <span className="text-[12px] font-extrabold text-black truncate">
                            {booking.customer_name}
                          </span>
                        </div>

                        {/* Service + Addon icon + Time */}
                        <span className="text-[10px] text-black/45 font-medium truncate min-w-0 shrink">
                          {booking.service?.name}
                          {hasAddons && (
                            <Layers className="inline h-[9px] w-[9px] mx-0.5 text-[#7B1FA2]" />
                          )}
                          {' · '}
                          {toPersianDigits(booking.start_time.slice(0, 5))}–{toPersianDigits(booking.end_time.slice(0, 5))}
                        </span>

                        {/* Price with icon */}
                        <div className="flex items-center gap-1 shrink ml-auto">
                          <DollarSign className="h-[10px] w-[10px] text-black/25" />
                          <span className="text-[10px] text-black/50 font-bold whitespace-nowrap">
                            {formatPrice(totalPrice)}
                          </span>
                        </div>

                        {/* Status badge */}
                        <div
                          className="flex items-center gap-1 px-1.5 py-0.5 shrink-0"
                          style={{ backgroundColor: statusCfg.bg, borderRadius: 4 }}
                        >
                          <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: statusCfg.dotColor }} />
                          <span className="text-[8px] font-semibold" style={{ color: statusCfg.color }}>
                            {statusCfg.label.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // ─── Normal variant ───
              return (
                <div
                  key={booking.id}
                  className="absolute right-14 left-2 cursor-pointer z-10"
                  style={{ top: pos.top, height: pos.height }}
                  onClick={() => onSelectBooking(booking)}
                >
                  <div
                    className="h-full border border-black/[0.06] overflow-hidden flex"
                    style={{ backgroundColor: style.bg }}
                  >
                    <div className="w-[3px] shrink-0" style={{ backgroundColor: style.accent }} />

                    <div className="flex-1 min-w-0 p-2">
                      {/* Row 1: Name + Status badge */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className="h-3 w-3 shrink-0 text-black/30" />
                          <span className="text-[12px] font-extrabold text-black truncate leading-tight">
                            {booking.customer_name}
                          </span>
                        </div>
                        <div
                          className="flex items-center gap-1 px-1.5 py-0.5 shrink-0"
                          style={{ backgroundColor: statusCfg.bg, borderRadius: 4 }}
                        >
                          <StatusIcon className="h-2.5 w-2.5" style={{ color: statusCfg.color }} />
                          <span className="text-[9px] font-semibold" style={{ color: statusCfg.color }}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Service + Addon icon + Time */}
                      <p className="text-[10px] text-black/50 font-medium mt-0.5 truncate">
                        {booking.service?.name}
                        {hasAddons && (
                          <Layers className="inline h-[9px] w-[9px] mx-0.5 text-[#7B1FA2]" />
                        )}
                        {' · '}
                        {toPersianDigits(booking.start_time.slice(0, 5))}–{toPersianDigits(booking.end_time.slice(0, 5))}
                      </p>

                      {/* Row 3: Tags with icons */}
                      {pos.height > 55 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 text-black/25" />
                            <span className="text-[10px] text-black/40 font-medium">
                              {toPersianDigits(totalDuration)} دقیقه
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-2.5 w-2.5 text-black/25" />
                            <span className="text-[10px] text-black/50 font-bold">
                              {formatPrice(totalPrice)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {booking.paid ? (
                              <CreditCard className="h-2.5 w-2.5 text-[#2E7D32]" />
                            ) : (
                              <CreditCard className="h-2.5 w-2.5 text-black/20" />
                            )}
                            <span className={`text-[10px] font-medium ${booking.paid ? 'text-[#2E7D32]' : 'text-black/35'}`}>
                              {booking.paid ? "پرداخت شده" : "پرداخت نشده"}
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
                    <div className="w-[3px] shrink-0 bg-[#FFB300]" />
                    <div className="flex-1 min-w-0 p-2">
                      <div className="flex items-center gap-1">
                        <Ban className="h-3 w-3 text-[#F57F17] shrink-0" />
                        <span className="text-[11px] font-bold text-[#E65100] truncate">استراحت</span>
                      </div>
                      {pos.height > 30 && (
                        <p className="text-[9px] text-[#F57F17]/70 mt-0.5">
                          {toPersianDigits(block.start_time.slice(0, 5))} – {toPersianDigits(block.end_time.slice(0, 5))}
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

            {/* Current time indicator */}
            {showNow && (
              <div
                className="absolute left-0 right-0 z-20 pointer-events-none"
                style={{ top: nowPosition }}
              >
                <div className="h-[2px] bg-[#5B9BD5]/30" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#5B9BD5]/30" />
              </div>
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
