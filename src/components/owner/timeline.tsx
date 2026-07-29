"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { User, Ban, Clock, CreditCard, CheckCircle2, Loader, XCircle, Layers, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { getTehranNow } from "@/lib/time";
import { STATUS_CONFIG } from "@/lib/constants";
import { servicePalette, statusColors, themeColor } from "@/lib/design-tokens";
import { useIsDark } from "@/lib/hooks/use-is-dark";
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

// 96px = a 30-minute appointment renders at 48px (>= 44pt/48dp tap target).
// Matches Cal.com / Motion / Notion Calendar day-view density and keeps
// short services tappable on phone in the salon.
const HOUR_HEIGHT = 96;

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
  const idx = hashString(serviceId) % servicePalette.length;
  const p = servicePalette[idx];
  return { accent: p.accent, bg: isDark ? p.bgDark : p.bg };
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

function getBlockPosition(startTime: string, endTime: string, startHour: number) {
  const start = timeToMinutes(startTime) - startHour * 60;
  const end = timeToMinutes(endTime) - startHour * 60;
  return {
    top: (start / 60) * HOUR_HEIGHT,
    height: Math.max(((end - start) / 60) * HOUR_HEIGHT, 24),
    durationMinutes: timeToMinutes(endTime) - timeToMinutes(startTime),
  };
}

function computeBookingTotal(booking: Booking, service?: Service, addons?: Addon[]) {
  const servicePrice = Number(service?.price) || 0;
  const addonsPrice = (booking.selected_addons || []).reduce((sum, id) => {
    const a = addons?.find((x) => x.id === id);
    return sum + (Number(a?.price) || 0);
  }, 0);
  return {
    totalPrice: servicePrice + addonsPrice,
    totalDuration: getBlockPosition(booking.start_time, booking.end_time, 0).durationMinutes,
    hasAddons: (booking.selected_addons || []).length > 0,
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
  const isDark = useIsDark();

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
      setTimeout(() => nowEl.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, []);

  // Theme-aware classes
  const t = (light: string, dark: string) => themeColor(light, dark, isDark);
  const hourColor = t("text-black/40", "text-white/40");
  const lineColor = t("bg-black/[0.04]", "bg-white/[0.04]");
  const dotBg = t("bg-black/[0.025]", "bg-white/[0.025]");
  const dotIcon = t("text-black/[0.18]", "text-white/[0.18]");
  const dotText = t("text-black/[0.28]", "text-white/[0.28]");
  const dotSub = t("text-black/[0.18]", "text-white/[0.18]");
  const borderColor = t("border-black/[0.06]", "border-white/[0.06]");
  const textPrimary = isDark ? "text-white" : "text-black";
  const textSecondary = t("text-black/50", "text-white/50");
  const textTertiary = t("text-black/40", "text-white/40");
  const textGhost = t("text-black/20", "text-white/20");
  const dotPattern = t(
    "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 3px, transparent 3px, transparent 6px)",
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 3px, transparent 3px, transparent 6px)"
  );

  return (
    <Card className="overflow-hidden">
      <div className="relative" style={{ height: totalHeight }}>
        {/* Hour labels */}
        {hourMarks.map((hour, i) => (
          <span
            key={`h-${hour}`}
            className={`absolute left-0 w-11 text-center text-[11px] font-bold ${hourColor} z-5`}
            style={{ top: i * HOUR_HEIGHT, fontVariantNumeric: "tabular-nums", transform: "translateY(-50%)" }}
          >
            {formatHourPersian(hour)}
          </span>
        ))}

        {/* Grid lines */}
        {hourMarks.map((hour, i) => (
          <div key={`l-${hour}`} className={`absolute h-px ${lineColor}`} style={{ top: i * HOUR_HEIGHT, left: 44, right: 0 }} />
        ))}

        {/* Half-hour dots */}
        {hourMarks.slice(0, -1).map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px" style={{ top: (i + 0.5) * HOUR_HEIGHT, left: 44, right: 0, backgroundImage: dotPattern }} />
        ))}

        {hasContent ? (
          <>
            {/* Bookings */}
            {bookings.map((b) => {
              const pos = getBlockPosition(b.start_time, b.end_time, startHour);
              const { totalPrice, totalDuration, hasAddons } = computeBookingTotal(b, b.service, addons);
              const style = getServiceStyle(b.service_id, isDark);
              const sc = getStatusConfig(b.status);
              const StatusIcon = sc.icon;
              const compact = pos.height < 60;

              const paidColor = t(statusColors.paid.light, statusColors.paid.dark);
              const addonColor = t(statusColors.addon.light, statusColors.addon.dark);

              return (
                <div
                  key={b.id}
                  className="absolute left-12 right-2 cursor-pointer z-10 press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded"
                  style={{ top: pos.top, height: pos.height }}
                  onClick={() => onSelectBooking(b)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectBooking(b); } }}
                  aria-label={`${b.customer_name}، ${b.service?.name}، ${b.start_time.slice(0, 5)} تا ${b.end_time.slice(0, 5)}${b.paid ? "" : "، پرداخت نشده"}`}
                >
                  <div className={`h-full ${borderColor} border overflow-hidden ${compact ? "flex items-stretch" : "flex"} rounded`} style={{ backgroundColor: style.bg }}>
                    <div className="w-[3px] shrink-0" style={{ backgroundColor: style.accent }} />

                    {compact ? (
                      <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
                        <div className="flex items-center gap-1 min-w-0 shrink">
                          <User className={`h-[11px] w-[11px] shrink-0 ${textGhost}`} />
                          <span className={`text-[12px] font-extrabold truncate ${textPrimary}`}>{b.customer_name}</span>
                        </div>
                        <span className={`text-[10px] font-medium truncate min-w-0 shrink ${textSecondary}`}>
                          {b.service?.name}
                          {hasAddons && <Layers className={`inline h-[9px] w-[9px] mx-0.5 ${addonColor}`} />}
                          {' · '}
                          {toPersianDigits(b.start_time.slice(0, 5))}–{toPersianDigits(b.end_time.slice(0, 5))}
                        </span>
                        <div className="flex items-center gap-1.5 shrink ml-auto">
                          <div className="flex items-center gap-0.5">
                            <Clock className={`h-2.5 w-2.5 ${textGhost}`} />
                            <span className={`text-[10px] font-medium whitespace-nowrap ${textTertiary}`}>{toPersianDigits(totalDuration)}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <DollarSign className={`h-2.5 w-2.5 ${textGhost}`} />
                            <span className={`text-[10px] font-bold whitespace-nowrap ${textSecondary}`}>{formatPrice(totalPrice)}</span>
                          </div>
                          <CreditCard className={`h-2.5 w-2.5 ${b.paid ? paidColor : textGhost}`} />
                        </div>
                        <div className="flex items-center gap-1 px-1.5 py-0.5 shrink-0" style={{ backgroundColor: sc.bg, borderRadius: 4 }}>
                          <StatusIcon className="h-2.5 w-2.5" style={{ color: sc.color }} />
                          <span className="text-[9px] font-semibold" style={{ color: sc.color }}>{sc.label}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 p-2">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className={`h-3 w-3 shrink-0 ${textGhost}`} />
                            <span className={`text-[12px] font-extrabold truncate leading-tight ${textPrimary}`}>{b.customer_name}</span>
                          </div>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 shrink-0" style={{ backgroundColor: sc.bg, borderRadius: 4 }}>
                            <StatusIcon className="h-2.5 w-2.5" style={{ color: sc.color }} />
                            <span className="text-[9px] font-semibold" style={{ color: sc.color }}>{sc.label}</span>
                          </div>
                        </div>
                        <p className={`text-[10px] font-medium mt-0.5 truncate ${textSecondary}`}>
                          {b.service?.name}
                          {hasAddons && <Layers className={`inline h-[9px] w-[9px] mx-0.5 ${addonColor}`} />}
                          {' · '}
                          {toPersianDigits(b.start_time.slice(0, 5))}–{toPersianDigits(b.end_time.slice(0, 5))}
                        </p>
                        {pos.height > 55 && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Clock className={`h-2.5 w-2.5 ${textGhost}`} />
                              <span className={`text-[10px] font-medium ${textTertiary}`}>{toPersianDigits(totalDuration)} دقیقه</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className={`h-2.5 w-2.5 ${textGhost}`} />
                              <span className={`text-[10px] font-bold ${textSecondary}`}>{formatPrice(totalPrice)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CreditCard className={`h-2.5 w-2.5 ${b.paid ? paidColor : textGhost}`} />
                              <span className={`text-[10px] font-medium ${b.paid ? paidColor : textTertiary}`}>
                                {b.paid ? "پرداخت شده" : "پرداخت نشده"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Blocked times */}
            {blockedTimes.map((block, idx) => {
              const pos = getBlockPosition(block.start_time, block.end_time, startHour);
              const isConfirming = confirmRemoveIndex === idx;
              const wb = t(statusColors.warningBg.light, statusColors.warningBg.dark);
              const wbBorder = t(statusColors.warningBorder.light, statusColors.warningBorder.dark);
              const wt = t(statusColors.blockText.light, statusColors.blockText.dark);
              const wst = t(statusColors.blockSubtext.light, statusColors.blockSubtext.dark);
              const wf = t(statusColors.blockFaint.light, statusColors.blockFaint.dark);
              const wa = t(statusColors.warningAccent.light, statusColors.warningAccent.dark);
              const bh = t(statusColors.blockHover.light, statusColors.blockHover.dark);

              return (
                <div key={`blk-${idx}`} className="absolute left-12 right-2 z-10" style={{ top: pos.top, height: pos.height }}>
                  {isConfirming ? (
                    <div className={`h-full ${wb} border ${wbBorder} overflow-hidden flex flex-col justify-center items-center p-2 animate-scale`}>
                      <AlertTriangle className={`h-4 w-4 ${wa} mb-1`} />
                      <p className={`text-[9px] ${wt} font-semibold mb-1.5 text-center`}>حذف شود؟</p>
                      <div className="flex gap-1">
                        <button onClick={(e) => { e.stopPropagation(); onRemoveBlock?.(idx); setConfirmRemoveIndex(null); }}
                          className="px-2 py-0.5 bg-[var(--destructive)] text-white text-[8px] font-semibold rounded">
                          بله
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmRemoveIndex(null); }}
                          className={`px-2 py-0.5 ${t("bg-black/10", "bg-white/10")} text-[8px] font-semibold rounded`}>
                          خیر
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`h-full border overflow-hidden flex cursor-pointer transition-colors`}
                      style={{ backgroundColor: t(statusColors.blockBg.light, statusColors.blockBg.dark), borderColor: wbBorder }}
                      onClick={() => setConfirmRemoveIndex(idx)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = bh)}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = t(statusColors.blockBg.light, statusColors.blockBg.dark))}
                    >
                      <div className="w-[3px] shrink-0" style={{ backgroundColor: wa as string }} />
                      <div className="flex-1 min-w-0 p-2">
                        <div className="flex items-center gap-1">
                          <Ban className={`h-3 w-3 shrink-0 ${wt}`} />
                          <span className={`text-[11px] font-bold truncate ${wt}`}>استراحت</span>
                        </div>
                        {pos.height > 30 && <p className={`text-[9px] ${wst} mt-0.5`}>{toPersianDigits(block.start_time.slice(0, 5))} – {toPersianDigits(block.end_time.slice(0, 5))}</p>}
                        {pos.height > 50 && <p className={`text-[8px] ${wf} mt-0.5`}>حذف: کلیک کنید</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Now indicator: 2px live line + 8px pulsing dot in the time gutter.
                Reference: Cal.com / Motion day-view "now" indicator. */}
            {showNow && (
              <div id="timeline-now" className="absolute z-20 pointer-events-none" style={{ top: nowPosition, left: 44, right: 0 }}>
                <div className="relative h-[2px] w-full">
                  {/* Pulse halo behind the dot */}
                  <div className="absolute -start-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full animate-ping opacity-60"
                    style={{ backgroundColor: 'currentColor' }} />
                </div>
                <div className="h-[2px]" style={{ backgroundColor: 'var(--accent-now)' }} />
                <div className="absolute start-0 top-[3px] w-2.5 h-2.5 rounded-full -translate-x-1/2 -translate-y-1/2 ring-2 ring-card"
                  style={{ backgroundColor: 'var(--accent-now)' }} />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2.5">
              <div className={`w-[52px] h-[52px] rounded-[14px] ${dotBg} flex items-center justify-center`}>
                <Calendar className={`h-[22px] w-[22px] ${dotIcon}`} />
              </div>
              <p className={`text-[14px] font-medium ${dotText}`}>برنامه‌ای برای این روز نیست</p>
              <p className={`text-[11px] ${dotSub}`}>رزرو جدید یا زمان مسدود اضافه کنید</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
