"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { User, Ban, Clock, CreditCard, CheckCircle2, Loader, XCircle, Layers, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { getTehranNow } from "@/lib/time";
import { STATUS_CONFIG } from "@/lib/constants";
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
  { accent: "#FDA4AF", bg: "#FFF5F6", bgDark: "#2D1518" }, // rose
  { accent: "#FCD34D", bg: "#FFFCF0", bgDark: "#2D2A15" }, // amber
  { accent: "#6EE7B7", bg: "#F0FDF8", bgDark: "#152D22" }, // emerald
  { accent: "#93C5FD", bg: "#F0F7FF", bgDark: "#151F2D" }, // blue
  { accent: "#C4B5FD", bg: "#F5F3FF", bgDark: "#1F1A2D" }, // purple
];

// Icon mapping for statuses
const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  reserved: Clock,
  confirmed: CheckCircle2,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: AlertTriangle,
  in_progress: Loader,
  pending: Clock,
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getServiceStyle(serviceId: string, isDark: boolean) {
  const idx = hashString(serviceId) % SERVICE_PALETTE.length;
  const palette = SERVICE_PALETTE[idx];
  return { accent: palette.accent, bg: isDark ? palette.bgDark : palette.bg };
}

function getStatusConfig(status: string) {
  const base = STATUS_CONFIG[status] || STATUS_CONFIG.reserved;
  return { ...base, icon: STATUS_ICONS[status] || Clock };
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
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
  const totalHours = endHour - startHour;
  const totalHeight = totalHours * HOUR_HEIGHT;
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const hourMarks = useMemo(
    () => Array.from({ length: totalHours + 1 }, (_, i) => startHour + i),
    [startHour, totalHours]
  );

  const now = getTehranNow();
  const currentMinute = now.minutes;
  const showNow = currentMinute >= startHour * 60 && currentMinute <= endHour * 60;
  const nowPosition = showNow ? ((currentMinute - startHour * 60) / 60) * HOUR_HEIGHT : 0;

  const hasContent = bookings.length > 0 || blockedTimes.length > 0;

  useEffect(() => {
    const nowEl = document.getElementById("timeline-now");
    if (nowEl) {
      setTimeout(() => {
        nowEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }
  }, []);

  // Theme-aware color helpers
  const textMuted = isDark ? "text-white/40" : "text-black/40";
  const textSubtle = isDark ? "text-white/50" : "text-black/50";
  const textFaint = isDark ? "text-white/30" : "text-black/30";
  const textGhost = isDark ? "text-white/20" : "text-black/20";
  const borderSubtle = isDark ? "border-white/[0.06]" : "border-black/[0.06]";
  const lineColor = isDark ? "bg-white/[0.04]" : "bg-black/[0.04]";
  const dotPattern = isDark
    ? "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 3px, transparent 3px, transparent 6px)"
    : "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 3px, transparent 3px, transparent 6px)";
  const emptyBg = isDark ? "bg-white/[0.025]" : "bg-black/[0.025]";
  const emptyIcon = isDark ? "text-white/[0.18]" : "text-black/[0.18]";
  const emptyText = isDark ? "text-white/[0.28]" : "text-black/[0.28]";
  const emptySubtext = isDark ? "text-white/[0.18]" : "text-black/[0.18]";

  return (
    <Card className="overflow-hidden">
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour labels — RTL: left side */}
        {hourMarks.map((hour, i) => (
          <span
            key={`hour-${hour}`}
            className={`absolute left-0 w-11 text-center text-[11px] font-bold ${textFaint} z-5`}
            style={{ top: i * HOUR_HEIGHT, fontVariantNumeric: "tabular-nums", transform: "translateY(-50%)" }}
          >
            {formatHourPersian(hour)}
          </span>
        ))}

        {/* Hour grid lines — left offset from labels */}
        {hourMarks.map((hour, i) => (
          <div
            key={`line-${hour}`}
            className={`absolute h-px ${lineColor}`}
            style={{ top: i * HOUR_HEIGHT, left: 44, right: 0 }}
          />
        ))}

        {/* Half-hour dotted lines */}
        {hourMarks.slice(0, -1).map((hour, i) => (
          <div
            key={`half-${hour}`}
            className="absolute h-px"
            style={{
              top: (i + 0.5) * HOUR_HEIGHT,
              left: 44,
              right: 0,
              backgroundImage: dotPattern,
            }}
          />
        ))}

        {hasContent ? (
          <>
            {/* Booking blocks */}
            {bookings.map((booking) => {
              const pos = getBlockPosition(booking.start_time, booking.end_time, startHour);
              const { totalPrice, totalDuration, hasAddons } = computeBookingTotal(booking, booking.service, addons);
              const style = getServiceStyle(booking.service_id, isDark);
              const statusCfg = getStatusConfig(booking.status);
              const StatusIcon = statusCfg.icon;
              const isCompact = pos.height < 60;

              if (isCompact) {
                // ─── Compact variant ───
                return (
                  <div
                    key={booking.id}
                    className="absolute left-12 right-2 cursor-pointer z-10"
                    style={{ top: pos.top, height: pos.height }}
                    onClick={() => onSelectBooking(booking)}
                  >
                    <div
                      className={`h-full ${borderSubtle} border overflow-hidden flex items-stretch`}
                      style={{ backgroundColor: style.bg }}
                    >
                      <div className="w-[3px] shrink-0" style={{ backgroundColor: style.accent }} />

                      <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
                        {/* Name */}
                        <div className="flex items-center gap-1 min-w-0 shrink">
                          <User className={`h-[11px] w-[11px] shrink-0 ${textFaint}`} />
                          <span className={`text-[12px] font-extrabold truncate ${isDark ? "text-white" : "text-black"}`}>
                            {booking.customer_name}
                          </span>
                        </div>

                        {/* Service + Addon icon + Time */}
                        <span className={`text-[10px] font-medium truncate min-w-0 shrink ${textSubtle}`}>
                          {booking.service?.name}
                          {hasAddons && (
                            <Layers className="inline h-[9px] w-[9px] mx-0.5 text-[#7B1FA2]" />
                          )}
                          {' · '}
                          {toPersianDigits(booking.start_time.slice(0, 5))}–{toPersianDigits(booking.end_time.slice(0, 5))}
                        </span>

                        {/* Tags */}
                        <div className="flex items-center gap-1.5 shrink ml-auto">
                          <div className="flex items-center gap-0.5">
                            <Clock className={`h-2.5 w-2.5 ${textGhost}`} />
                            <span className={`text-[10px] font-medium whitespace-nowrap ${textMuted}`}>
                              {toPersianDigits(totalDuration)}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <DollarSign className={`h-2.5 w-2.5 ${textGhost}`} />
                            <span className={`text-[10px] font-bold whitespace-nowrap ${textSubtle}`}>
                              {formatPrice(totalPrice)}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {booking.paid ? (
                              <CreditCard className="h-2.5 w-2.5 text-[#2E7D32]" />
                            ) : (
                              <CreditCard className={`h-2.5 w-2.5 ${textGhost}`} />
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
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
                    </div>
                  </div>
                );
              }

              // ─── Normal variant ───
              return (
                <div
                  key={booking.id}
                  className="absolute left-12 right-2 cursor-pointer z-10"
                  style={{ top: pos.top, height: pos.height }}
                  onClick={() => onSelectBooking(booking)}
                >
                  <div
                    className={`h-full ${borderSubtle} border overflow-hidden flex`}
                    style={{ backgroundColor: style.bg }}
                  >
                    <div className="w-[3px] shrink-0" style={{ backgroundColor: style.accent }} />

                    <div className="flex-1 min-w-0 p-2">
                      {/* Row 1: Name + Status badge */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <User className={`h-3 w-3 shrink-0 ${textFaint}`} />
                          <span className={`text-[12px] font-extrabold truncate leading-tight ${isDark ? "text-white" : "text-black"}`}>
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
                      <p className={`text-[10px] font-medium mt-0.5 truncate ${textSubtle}`}>
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
                            <Clock className={`h-2.5 w-2.5 ${textGhost}`} />
                            <span className={`text-[10px] font-medium ${textMuted}`}>
                              {toPersianDigits(totalDuration)} دقیقه
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className={`h-2.5 w-2.5 ${textGhost}`} />
                            <span className={`text-[10px] font-bold ${textSubtle}`}>
                              {formatPrice(totalPrice)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {booking.paid ? (
                              <CreditCard className="h-2.5 w-2.5 text-[#2E7D32]" />
                            ) : (
                              <CreditCard className={`h-2.5 w-2.5 ${textGhost}`} />
                            )}
                            <span className={`text-[10px] font-medium ${booking.paid ? 'text-[#2E7D32]' : textMuted}`}>
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
              const isConfirming = confirmRemoveIndex === index;
              return (
                <div
                  key={`block-${index}`}
                  className="absolute left-12 right-2 z-10"
                  style={{ top: pos.top, height: pos.height }}
                >
                  {isConfirming ? (
                    /* Confirmation state */
                    <div className={`h-full ${isDark ? "bg-[#2D2A15] border-[#FFD54F]/40" : "bg-[#FFF3E0] border-[#FF9800]/40"} border overflow-hidden flex flex-col justify-center items-center p-2 animate-scale`}>
                      <AlertTriangle className={`h-4 w-4 ${isDark ? "text-[#FFD54F]" : "text-[#F57F17]"} mb-1`} />
                      <p className={`text-[9px] ${isDark ? "text-[#FFD54F]" : "text-[#E65100]"} font-semibold mb-1.5 text-center`}>حذف شود؟</p>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemoveBlock?.(index); setConfirmRemoveIndex(null); }}
                          className="px-2 py-0.5 bg-[#C62828] text-white text-[8px] font-semibold rounded"
                        >
                          بله
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmRemoveIndex(null); }}
                          className={`px-2 py-0.5 ${isDark ? "bg-white/10" : "bg-black/10"} text-[8px] font-semibold rounded`}
                        >
                          خیر
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal state */
                    <div
                      className={`h-full ${isDark ? "bg-[#2D2A15] border-[#FFD54F]/30 hover:bg-[#3D3515]" : "bg-[#FFF8E1] border-[#FFD54F]/40 hover:bg-[#FFF3E0]"} border overflow-hidden flex cursor-pointer transition-colors`}
                      onClick={() => setConfirmRemoveIndex(index)}
                    >
                      <div className="w-[3px] shrink-0 bg-[#FFB300]" />
                      <div className="flex-1 min-w-0 p-2">
                        <div className="flex items-center gap-1">
                          <Ban className={`h-3 w-3 ${isDark ? "text-[#FFD54F]" : "text-[#F57F17]"} shrink-0`} />
                          <span className={`text-[11px] font-bold ${isDark ? "text-[#FFD54F]" : "text-[#E65100]"} truncate`}>استراحت</span>
                        </div>
                        {pos.height > 30 && (
                          <p className={`text-[9px] ${isDark ? "text-[#FFD54F]/70" : "text-[#F57F17]/70"} mt-0.5`}>
                            {toPersianDigits(block.start_time.slice(0, 5))} – {toPersianDigits(block.end_time.slice(0, 5))}
                          </p>
                        )}
                        {pos.height > 50 && (
                          <p className={`text-[8px] ${isDark ? "text-[#FFD54F]/50" : "text-[#F57F17]/50"} mt-0.5`}>حذف: کلیک کنید</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current time indicator */}
            {showNow && (
              <div
                id="timeline-now"
                className="absolute z-20 pointer-events-none"
                style={{ top: nowPosition, left: 44, right: 0 }}
              >
                <div className={`h-[2px] ${isDark ? "bg-[#5B9BD5]/40" : "bg-[#5B9BD5]/30"}`} />
                <div className={`absolute left-0 top-[3px] w-2 h-2 rounded-full ${isDark ? "bg-[#5B9BD5]/50" : "bg-[#5B9BD5]/40"} -translate-x-1/2 -translate-y-1/2`} />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2.5">
              <div className={`w-[52px] h-[52px] rounded-[14px] ${emptyBg} flex items-center justify-center`}>
                <Calendar className={`h-[22px] w-[22px] ${emptyIcon}`} />
              </div>
              <p className={`text-[14px] font-medium ${emptyText}`}>برنامه‌ای برای این روز نیست</p>
              <p className={`text-[11px] ${emptySubtext}`}>رزرو جدید یا زمان مسدود اضافه کنید</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
