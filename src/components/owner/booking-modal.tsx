"use client";

import { useState, useMemo } from "react";
import { User, Phone, MessageSquare, Wrench, Calendar, Clock, DollarSign, Trash2, AlertTriangle, CheckCircle2, XCircle, Loader, X } from "lucide-react";
import { formatPrice, toPersianDigits, formatJalaliDateShort, gregorianToJalali, PERSIAN_MONTHS } from "@/lib/jalali";
import { calculateBookingPrice } from "@/lib/pricing";
import { STATUS_CONFIG, STATUS_CONFIG_DARK, themeColor } from "@/lib/design-tokens";
import { VALID_TRANSITIONS } from "@/lib/constants";
import { useIsDark } from "@/lib/hooks/use-is-dark";
import { parseGregorianDateKey, getTehranDateKey } from "@/lib/time";
import { generateTimeSlots, type WorkingHours } from "@/lib/slots";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Booking, Service, Addon } from "@/lib/types";

interface BookingModalProps {
  booking: Booking;
  services: Service[];
  addons: Addon[];
  isPaid: boolean;
  /** Display-only completed-booking count for this customer (computed by the
     caller from the loaded bookings list) — mirrors the v-2 drawer history
     line. No-show is omitted: the backend status constraint has no no-show
     state, so a permanent "۰ غیبت" would be fake precision. */
  customerHistory?: { completed: number };
  /** Reschedule support (v-2 جابه‌جایی): engine context + server mover.
     When absent the move UI stays hidden and the drawer is unchanged. */
  rescheduleContext?: {
    workingHours: WorkingHours;
    bookings: Booking[];
    blockedTimes: Array<{ date_gregorian: string; start_time: string; end_time: string }>;
    specificDaysOff: string[];
    engine: {
      slot_interval_minutes: number; slot_buffer_minutes: number;
      proximity_window_hours: number; early_extra_hours: number; late_extra_hours: number;
      expand_threshold: number; allow_overflow: boolean; overflow_minutes: number;
      optimization_mode: "hybrid" | "legacy"; suggestion_limit: number; min_useful_gap_minutes: number;
    };
  };
  onReschedule?: (date_gregorian: string, start_time: string, end_time: string) => Promise<{ success: boolean; error?: string }>;
  onTogglePaid: () => void;
  onStatusChange: (status: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  reserved: Clock,
  confirmed: CheckCircle2,
  completed: CheckCircle2,
  cancelled: XCircle,
  no_show: AlertTriangle,
  in_progress: Loader,
  pending: Clock,
};

const ALL_STATUS_OPTIONS: { value: string; label: string; Icon: typeof CheckCircle2 }[] = Object.entries(
  STATUS_CONFIG
).map(([value, { label }]) => ({
  value,
  label,
  Icon: STATUS_ICONS[value] || Clock,
}));

/** Colors resolve per theme at render: the light hexes fail AA on the dark
 * popover (3.0-4.0:1), so STATUS_CONFIG_DARK overrides them. */
function statusColorFor(value: string, isDark: boolean): string {
  const config = isDark ? { ...STATUS_CONFIG, ...STATUS_CONFIG_DARK } : STATUS_CONFIG;
  return config[value]?.color ?? STATUS_CONFIG[value]?.color ?? STATUS_CONFIG.pending.color;
}

export function BookingModal({ booking, services, addons, isPaid, customerHistory, rescheduleContext, onReschedule, onTogglePaid, onStatusChange, onDelete, onClose }: BookingModalProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [reschedDate, setReschedDate] = useState(() => booking.date_gregorian.split("T")[0]);
  const [reschedError, setReschedError] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  // In-flight flag: disables status/paid controls while a write runs so a
  // double-tap cannot queue opposite writes for a net no-op.
  const [isMutating, setIsMutating] = useState(false);

  const runMutation = async (action: () => void | Promise<void>) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      await action();
    } finally {
      setIsMutating(false);
    }
  };
  const currentStatus = booking.status;
  const isDark = useIsDark();
  const allowedTransitions = useMemo(() => VALID_TRANSITIONS[currentStatus] || [], [currentStatus]);
  const statusOptions = useMemo(
    () => ALL_STATUS_OPTIONS
      .filter((opt) => allowedTransitions.includes(opt.value))
      .map((opt) => ({ ...opt, color: statusColorFor(opt.value, isDark) })),
    [allowedTransitions, isDark]
  );
  const t = (l: string, d: string) => themeColor(l, d, isDark);

  const jalali = gregorianToJalali(parseGregorianDateKey(booking.date_gregorian));
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const price = calculateBookingPrice(booking, services, addons);
  const startMinutes = parseInt(booking.start_time.split(":")[0]) * 60 + parseInt(booking.start_time.split(":")[1]);
  const endMinutes = parseInt(booking.end_time.split(":")[0]) * 60 + parseInt(booking.end_time.split(":")[1]);
  const duration = endMinutes >= startMinutes ? endMinutes - startMinutes : (endMinutes + 24 * 60) - startMinutes;
  const selectedAddons = (booking.selected_addons || []).map((id) => addons.find((a) => a.id === id)).filter(Boolean);
  const statusConfigBase = ALL_STATUS_OPTIONS.find((s: { value: string }) => s.value === currentStatus) || ALL_STATUS_OPTIONS[0];
  const statusConfig = { ...statusConfigBase, color: statusColorFor(currentStatus, isDark) };
  const shortId = `BK-${booking.id.slice(-6).toUpperCase()}`;
  const createdAtTime = booking.created_at ? new Date(booking.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

  /* Reschedule (v-2 RP): move preserving duration, validated atomically by
     PATCH /api/owner/bookings. Slot list excludes this booking itself. */
  const canReschedule = booking.status !== "cancelled" && booking.status !== "completed" && rescheduleContext && onReschedule;
  const reschedDays = useMemo(() => {
    const base = parseGregorianDateKey(getTehranDateKey(new Date()));
    return Array.from({ length: 14 }, (_, i) => getTehranDateKey(new Date(base.getTime() + i * 864e5)));
  }, []);
  const reschedSlots = useMemo(() => {
    if (!rescheduling || !rescheduleContext) return [];
    const ctx = rescheduleContext;
    const dayBookings = ctx.bookings
      .filter((b) => b.date_gregorian.split("T")[0] === reschedDate
        && b.id !== booking.id
        && (b.status === "reserved" || b.status === "confirmed" || b.status === "in_progress" || b.status === "pending"))
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
    const dayLocks = ctx.blockedTimes
      .filter((l) => l.date_gregorian.split("T")[0] === reschedDate)
      .map((l) => ({ start_time: l.start_time, end_time: l.end_time }));
    return generateTimeSlots(
      ctx.workingHours, parseGregorianDateKey(reschedDate), duration, 0,
      ctx.engine.slot_interval_minutes ?? 15, ctx.engine.slot_buffer_minutes ?? 0,
      dayBookings, dayLocks,
      {
        proximity_window_hours: ctx.engine.proximity_window_hours,
        early_extra_hours: ctx.engine.early_extra_hours,
        late_extra_hours: ctx.engine.late_extra_hours,
        expand_threshold: ctx.engine.expand_threshold,
        allow_overflow: ctx.engine.allow_overflow,
        overflow_minutes: ctx.engine.overflow_minutes,
        optimization_mode: ctx.engine.optimization_mode,
        suggestion_limit: ctx.engine.suggestion_limit,
        min_useful_gap_minutes: ctx.engine.min_useful_gap_minutes,
      },
      ctx.specificDaysOff,
    ).filter((s) => s.available);
  }, [rescheduling, reschedDate, rescheduleContext, booking.id, duration]);
  const handleMove = async (start: string) => {
    if (!onReschedule || isMoving) return;
    const [h, m] = start.split(":").map(Number);
    const endMin = (h || 0) * 60 + (m || 0) + duration;
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    setIsMoving(true);
    setReschedError("");
    try {
      const r = await onReschedule(reschedDate, start, end);
      if (r.success) onClose();
      else setReschedError(r.error || "جابه‌جایی انجام نشد");
    } finally {
      setIsMoving(false);
    }
  };

  /* Category icon tints: neutral tokens (same recipe as customer list rows);
     price keeps its semantic warning tint. Status colors stay categorical via
     design-tokens (STATUS_CONFIG). */
  const addonColor = t("text-muted-foreground", "text-muted-foreground");
  const phoneColor = t("text-muted-foreground", "text-muted-foreground");
  const calendarColor = t("text-muted-foreground", "text-muted-foreground");
  const priceColor = t("text-warning", "text-warning");
  const paidColor = t("text-success", "text-success");
  const deleteColor = t("text-destructive", "text-destructive");
  const deleteHover = t("text-destructive", "text-destructive");
  const subtleBg = t("bg-black/[0.02]", "bg-white/[0.02]");
  const subtleBg2 = t("bg-black/[0.03]", "bg-white/[0.03]");
  const subtleBg3 = t("bg-black/[0.05]", "bg-white/[0.05]");
  const subtleBorder = t("border-black/[0.06]", "border-white/[0.06]");
  const subtleBorder2 = t("border-black/[0.04]", "border-white/[0.04]");
  const textMuted = t("text-black/35", "text-white/35");
  const textMuted2 = t("text-black/40", "text-white/40");

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-w-[340px] bg-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-body-lg font-normal">جزئیات نوبت</DialogTitle>
            <span className={`text-small font-normal text-muted-foreground ${subtleBg2} px-2 py-0.5 rounded-none`} dir="ltr">{shortId}</span>
          </div>
          <button onClick={onClose} aria-label="بستن" className={`tap-44 w-7 h-7 rounded-none ${subtleBg2} flex items-center justify-center`}>
            <X className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>

        {/* Customer */}
        <div className={`flex items-center justify-between p-2.5 ${subtleBg} rounded-none mb-3`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-none ${subtleBg3} flex items-center justify-center`}>
              <User className={`h-4 w-4 ${textMuted}`} />
            </div>
            <div>
              <div className="text-caption font-normal">{booking.customer_name}</div>
              <div className="text-small text-muted-foreground mt-px" dir="ltr">{toPersianDigits(booking.customer_phone)}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => window.open(`sms:${booking.customer_phone}`, "_self")}
              aria-label={`ارسال پیامک به ${booking.customer_name || booking.customer_phone}`}
              className={`tap-44 w-8 h-8 rounded-none border ${subtleBorder} bg-card flex items-center justify-center`}>
              <MessageSquare className={`h-3.5 w-3.5 ${addonColor}`} />
            </button>
            <button onClick={() => window.open(`tel:${booking.customer_phone}`, "_self")}
              aria-label={`تماس با ${booking.customer_name || booking.customer_phone}`}
              className={`tap-44 w-8 h-8 rounded-none border ${subtleBorder} bg-card flex items-center justify-center`}>
              <Phone className={`h-3.5 w-3.5 ${phoneColor}`} />
            </button>
          </div>
        </div>
        {customerHistory && (
          <p className="text-small text-muted-foreground mt-2 mb-3">
            سابقه این مشتری: {toPersianDigits(customerHistory.completed)} نوبت انجام‌شده
          </p>
        )}

        {/* Details */}
        <div className="mb-3">
          <div className={`py-[7px] border-b ${subtleBorder2}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-none ${subtleBg2} flex items-center justify-center`}>
                  <Wrench className={`h-[11px] w-[11px] ${textMuted2}`} />
                </div>
                <span className="text-small font-normal">{booking.service?.name || "نامشخص"}</span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAddons.map((addon) => (
                    <span key={addon!.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-small font-normal`}
                      style={{ backgroundColor: `${addonColor}` + "10", color: addonColor as string }}>
                      {addon!.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className={`py-[7px] border-b ${subtleBorder2}`}>
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-none flex items-center justify-center`} style={{ backgroundColor: `${calendarColor}14` }}>
                <Calendar className={`h-[11px] w-[11px]`} style={{ color: calendarColor as string }} />
              </div>
              <span className="text-small font-normal">{shortDate}</span>
              <span className="text-small text-muted-foreground mx-1">•</span>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-small text-muted-foreground">{toPersianDigits(booking.start_time.slice(0, 5))} – {toPersianDigits(booking.end_time.slice(0, 5))}</span>
              <span className="text-small text-muted-foreground ms-auto">{toPersianDigits(duration)} دقیقه</span>
            </div>
          </div>

          {/* Price */}
          <div className="py-[7px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-none flex items-center justify-center`} style={{ backgroundColor: `${priceColor}14` }}>
                  <DollarSign className={`h-[11px] w-[11px]`} style={{ color: priceColor as string }} />
                </div>
                <span className="text-small font-normal">هزینه</span>
              </div>
              <span className="text-small font-normal" style={{ color: priceColor as string }}>{formatPrice(Number(price))} تومان</span>
            </div>
          </div>
        </div>

        {/* Status + Paid Toggle */}
        <div className="flex items-center justify-between mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-none bg-muted text-small font-normal">
              <statusConfig.Icon className="h-3.5 w-3.5" style={{ color: statusConfig.color }} />
              <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              {statusOptions.length === 0 ? (
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground text-small">بدون تغییر وضعیت</span>
                </DropdownMenuItem>
              ) : statusOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  disabled={isMutating}
                  onClick={() => runMutation(() => onStatusChange(opt.value))}
                  className="gap-2"
                >
                  <opt.Icon className="h-3.5 w-3.5" style={{ color: opt.color }} />
                  <span style={{ color: opt.color }}>{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => runMutation(onTogglePaid)}
            disabled={isMutating}
            aria-busy={isMutating}
            aria-label={isPaid ? "علامت‌گذاری به عنوان پرداخت‌نشده" : "علامت‌گذاری به عنوان پرداخت‌شده"}
            className="flex items-center gap-2 disabled:text-foreground/70"
          >
            <span className={`text-small font-normal ${isPaid ? paidColor : "text-muted-foreground"}`}>{isPaid ? "پرداخت شده" : "پرداخت نشده"}</span>
            <div className={`w-9 h-5 rounded-full relative`} style={{ backgroundColor: isPaid ? paidColor as string : "var(--muted)" }}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background ${isPaid ? "end-0.5" : "end-[18px]"}`} />
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {canReschedule && (
            <button onClick={() => { setRescheduling((v) => !v); setReschedError(""); }}
              aria-expanded={rescheduling}
              className="flex-1 py-2.5 rounded-none text-small font-normal flex items-center justify-center gap-1.5 border border-border bg-card">
              <Calendar className="h-3.5 w-3.5" />
              جابه‌جایی
            </button>
          )}
          <button onClick={() => setDeleteOpen(true)}
            className={`flex-1 py-2.5 rounded-none text-small font-normal flex items-center justify-center gap-1.5`}
            style={{ backgroundColor: `${deleteColor}14`, color: deleteColor as string }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${deleteColor}1F`)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${deleteColor}14`)}>
            <Trash2 className="h-3.5 w-3.5" />
            حذف نوبت
          </button>
        </div>

        {canReschedule && rescheduling && (
          <div className="mt-3 rounded-none border border-border p-3">
            <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
              {reschedDays.map((key) => {
                const j = gregorianToJalali(parseGregorianDateKey(key));
                const sel = key === reschedDate;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReschedDate(key)}
                    aria-pressed={sel}
                    aria-label={`${toPersianDigits(j.jd)} ${PERSIAN_MONTHS[j.jm - 1]}`}
                    className={`flex h-14 min-w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-none border px-2 text-xs font-normal ${sel ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
                  >
                    <span className="text-base leading-none">{toPersianDigits(j.jd)}</span>
                    <span className={`text-micro leading-none ${sel ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{PERSIAN_MONTHS[j.jm - 1].slice(0, 5)}</span>
                  </button>
                );
              })}
            </div>
            {reschedSlots.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted-foreground">در این روز ساعت آزادی نیست.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {reschedSlots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={isMoving}
                    onClick={() => handleMove(s.time)}
                    className="flex h-11 items-center justify-center rounded-none border border-border bg-card text-sm font-normal tabular-nums disabled:opacity-50"
                  >
                    {toPersianDigits(s.time)}
                  </button>
                ))}
              </div>
            )}
            {reschedError && (
              <p role="alert" className="mt-2 text-center text-xs text-destructive">{reschedError}</p>
            )}
          </div>
        )}

        {/* Created at */}
        {createdAtTime && (
          <p className="text-small text-muted-foreground text-center mt-2">
            ثبت‌شده در ساعت {createdAtTime}
          </p>
        )}
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[300px] bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: deleteColor as string }}>
              <AlertTriangle className="h-4 w-4" />
              حذف نوبت
            </AlertDialogTitle>
            <AlertDialogDescription className="text-small" style={{ color: `${deleteColor}B3` }}>
              نوبت لغو می‌شود. در صورت نیاز می‌توانید بعداً آن را دوباره فعال کنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { onDelete(booking.id); onClose(); }}
              className="text-small font-normal text-white" style={{ backgroundColor: deleteColor as string }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = deleteHover as string)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = deleteColor as string)}>
              بله، حذف
            </AlertDialogAction>
            <AlertDialogCancel className="bg-muted text-small font-normal border-0">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
