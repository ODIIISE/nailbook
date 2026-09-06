"use client";

import { useState, useMemo } from "react";
import { User, Phone, MessageSquare, Wrench, Calendar, Clock, DollarSign, Trash2, AlertTriangle, CheckCircle2, XCircle, Loader } from "lucide-react";
import { formatPrice, toPersianDigits, formatJalaliDateShort, gregorianToJalali } from "@/lib/jalali";
import { calculateBookingPrice } from "@/lib/pricing";
import { STATUS_CONFIG, STATUS_CONFIG_DARK, themeColor } from "@/lib/design-tokens";
import { VALID_TRANSITIONS } from "@/lib/constants";
import { useIsDark } from "@/lib/hooks/use-is-dark";
import { parseGregorianDateKey } from "@/lib/time";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Booking, Service, Addon } from "@/lib/types";

interface BookingModalProps {
  booking: Booking;
  services: Service[];
  addons: Addon[];
  isPaid: boolean;
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
  return config[value]?.color ?? STATUS_CONFIG[value]?.color ?? "#6B7280";
}

export function BookingModal({ booking, services, addons, isPaid, onTogglePaid, onStatusChange, onDelete, onClose }: BookingModalProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
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

  const addonColor = t("text-violet-700", "text-violet-400");
  const phoneColor = t("text-blue-700", "text-blue-400");
  const calendarColor = t("text-blue-700", "text-blue-400");
  const priceColor = t("text-amber-700", "text-amber-500");
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
      <DialogContent showCloseButton={false} className="max-w-[340px] bg-card border border-border rounded-2xl p-5 shadow-elevated ring-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-body-lg font-bold">جزئیات نوبت</DialogTitle>
            <span className={`text-small font-semibold text-muted-foreground ${subtleBg2} px-2 py-0.5 rounded-md`} dir="ltr">{shortId}</span>
          </div>
          <button onClick={onClose} aria-label="بستن" className={`w-7 h-7 rounded-lg ${subtleBg2} flex items-center justify-center`}>
            <svg className="h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Customer */}
        <div className={`flex items-center justify-between p-2.5 ${subtleBg} rounded-xl mb-3`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-[10px] ${subtleBg3} flex items-center justify-center`}>
              <User className={`h-4 w-4 ${textMuted}`} />
            </div>
            <div>
              <div className="text-caption font-bold">{booking.customer_name}</div>
              <div className="text-small text-muted-foreground mt-px" dir="ltr">{toPersianDigits(booking.customer_phone)}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => window.open(`sms:${booking.customer_phone}`, "_self")}
              aria-label={`ارسال پیامک به ${booking.customer_name || booking.customer_phone}`}
              className={`w-8 h-8 rounded-lg border ${subtleBorder} bg-card flex items-center justify-center`}>
              <MessageSquare className={`h-3.5 w-3.5 ${addonColor}`} />
            </button>
            <button onClick={() => window.open(`tel:${booking.customer_phone}`, "_self")}
              aria-label={`تماس با ${booking.customer_name || booking.customer_phone}`}
              className={`w-8 h-8 rounded-lg border ${subtleBorder} bg-card flex items-center justify-center`}>
              <Phone className={`h-3.5 w-3.5 ${phoneColor}`} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="mb-3">
          <div className={`py-[7px] border-b ${subtleBorder2}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-md ${subtleBg2} flex items-center justify-center`}>
                  <Wrench className={`h-[11px] w-[11px] ${textMuted2}`} />
                </div>
                <span className="text-small font-semibold">{booking.service?.name || "نامشخص"}</span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAddons.map((addon) => (
                    <span key={addon!.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-small font-semibold`}
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
              <div className={`w-6 h-6 rounded-md flex items-center justify-center`} style={{ backgroundColor: `${calendarColor}14` }}>
                <Calendar className={`h-[11px] w-[11px]`} style={{ color: calendarColor as string }} />
              </div>
              <span className="text-small font-medium">{shortDate}</span>
              <span className="text-small text-muted-foreground mx-1">•</span>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-small text-muted-foreground">{toPersianDigits(booking.start_time.slice(0, 5))} – {toPersianDigits(booking.end_time.slice(0, 5))}</span>
              <span className="text-small text-muted-foreground/60 ml-auto">{toPersianDigits(duration)} دقیقه</span>
            </div>
          </div>

          {/* Price */}
          <div className="py-[7px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center`} style={{ backgroundColor: `${priceColor}14` }}>
                  <DollarSign className={`h-[11px] w-[11px]`} style={{ color: priceColor as string }} />
                </div>
                <span className="text-small font-medium">هزینه</span>
              </div>
              <span className="text-small font-bold" style={{ color: priceColor as string }}>{formatPrice(Number(price))} تومان</span>
            </div>
          </div>
        </div>

        {/* Status + Paid Toggle */}
        <div className="flex items-center justify-between mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-small font-semibold">
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
            className="flex items-center gap-2 disabled:opacity-50"
          >
            <span className={`text-small font-medium ${isPaid ? paidColor : "text-muted-foreground"}`}>{isPaid ? "پرداخت شده" : "پرداخت نشده"}</span>
            <div className={`w-9 h-5 rounded-full relative`} style={{ backgroundColor: isPaid ? paidColor as string : "var(--muted)" }}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background shadow ${isPaid ? "right-0.5" : "right-[18px]"}`} />
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setDeleteOpen(true)}
            className={`flex-1 py-2.5 rounded-[10px] text-small font-semibold flex items-center justify-center gap-1.5`}
            style={{ backgroundColor: `${deleteColor}14`, color: deleteColor as string }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${deleteColor}1F`)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${deleteColor}14`)}>
            <Trash2 className="h-3.5 w-3.5" />
            حذف نوبت
          </button>
        </div>

        {/* Created at */}
        {createdAtTime && (
          <p className="text-small text-muted-foreground/50 text-center mt-2">
            ثبت‌شده در ساعت {createdAtTime}
          </p>
        )}
      </DialogContent>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[300px] bg-card border border-border rounded-2xl p-5 shadow-elevated ring-0">
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
              className="text-small font-semibold text-white" style={{ backgroundColor: deleteColor as string }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = deleteHover as string)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = deleteColor as string)}>
              بله، حذف
            </AlertDialogAction>
            <AlertDialogCancel className="bg-muted text-small font-semibold border-0">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
