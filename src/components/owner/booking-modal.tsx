"use client";

import { useState } from "react";
import { User, Phone, MessageSquare, Wrench, Calendar, Clock, DollarSign, Check, Trash2, AlertTriangle } from "lucide-react";
import { formatPrice, toPersianDigits, formatJalaliDateShort, gregorianToJalali } from "@/lib/jalali";
import { calculateBookingPrice } from "@/lib/pricing";
import { STATUS_CONFIG } from "@/lib/constants";
import { statusColors, themeColor } from "@/lib/design-tokens";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

const STATUS_OPTIONS: { value: string; label: string; color: string }[] = Object.entries(STATUS_CONFIG).map(
  ([value, { label, color }]) => ({ value, label, color })
);

export function BookingModal({ booking, services, addons, isPaid, onTogglePaid, onStatusChange, onDelete, onClose }: BookingModalProps) {
  const [currentStatus, setCurrentStatus] = useState(booking.status);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDark = document.documentElement.classList.contains("dark");
  const t = (l: string, d: string) => themeColor(l, d, isDark);

  const jalali = gregorianToJalali(new Date(booking.date_gregorian));
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const price = calculateBookingPrice(booking, services, addons);
  const startMinutes = parseInt(booking.start_time.split(":")[0]) * 60 + parseInt(booking.start_time.split(":")[1]);
  const endMinutes = parseInt(booking.end_time.split(":")[0]) * 60 + parseInt(booking.end_time.split(":")[1]);
  const duration = endMinutes - startMinutes;
  const selectedAddons = (booking.selected_addons || []).map((id) => addons.find((a) => a.id === id)).filter(Boolean);
  const statusConfig = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];
  const shortId = `BK-${booking.id.slice(-6).toUpperCase()}`;
  const createdAtTime = booking.created_at ? new Date(booking.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

  const addonColor = t(statusColors.addon.light, statusColors.addon.dark);
  const phoneColor = t(statusColors.phone.light, statusColors.phone.dark);
  const calendarColor = t(statusColors.calendar.light, statusColors.calendar.dark);
  const priceColor = t(statusColors.price.light, statusColors.price.dark);
  const paidColor = t(statusColors.paid.light, statusColors.paid.dark);
  const deleteColor = t(statusColors.delete.light, statusColors.delete.dark);
  const deleteHover = t(statusColors.deleteHover.light, statusColors.deleteHover.dark);
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
            <h2 className="text-[16px] font-bold">جزئیات نوبت</h2>
            <span className={`text-[10px] font-semibold text-muted-foreground ${subtleBg2} px-2 py-0.5 rounded-md`} dir="ltr">{shortId}</span>
          </div>
          <button onClick={onClose} className={`w-7 h-7 rounded-lg ${subtleBg2} flex items-center justify-center`}>
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
              <div className="text-[13px] font-bold">{booking.customer_name}</div>
              <div className="text-[11px] text-muted-foreground mt-px" dir="ltr">{toPersianDigits(booking.customer_phone)}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => window.open(`sms:${booking.customer_phone}`, "_self")}
              className={`w-8 h-8 rounded-lg border ${subtleBorder} bg-card flex items-center justify-center`}>
              <MessageSquare className={`h-3.5 w-3.5 ${addonColor}`} />
            </button>
            <button onClick={() => window.open(`tel:${booking.customer_phone}`, "_self")}
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
                <span className="text-[12px] font-semibold">{booking.service?.name || "نامشخص"}</span>
              </div>
              {selectedAddons.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAddons.map((addon) => (
                    <span key={addon!.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[10px] font-semibold`}
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
              <span className="text-[12px] font-medium">{shortDate}</span>
              <span className="text-[11px] text-muted-foreground mx-1">•</span>
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">{toPersianDigits(booking.start_time.slice(0, 5))} – {toPersianDigits(booking.end_time.slice(0, 5))}</span>
              <span className="text-[10px] text-muted-foreground/60 mr-auto">{toPersianDigits(duration)} دقیقه</span>
            </div>
          </div>

          {/* Price */}
          <div className="py-[7px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center`} style={{ backgroundColor: `${priceColor}14` }}>
                  <DollarSign className={`h-[11px] w-[11px]`} style={{ color: priceColor as string }} />
                </div>
                <span className="text-[12px] font-medium">هزینه</span>
              </div>
              <span className="text-[12px] font-bold" style={{ color: priceColor as string }}>{formatPrice(Number(price))} تومان</span>
            </div>
          </div>
        </div>

        {/* Status + Paid Toggle */}
        <div className="flex items-center justify-between mb-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-[11px] font-semibold">
              <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => { setCurrentStatus(opt.value as typeof currentStatus); onStatusChange(opt.value); }}>
                  <span style={{ color: opt.color }}>{opt.label}</span>
                  {currentStatus === opt.value && <Check className={`h-3.5 w-3.5 ${paidColor} mr-auto`} />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={onTogglePaid} className="flex items-center gap-2">
            <span className={`text-[11px] font-medium ${isPaid ? paidColor : "text-muted-foreground"}`}>{isPaid ? "پرداخت شده" : "پرداخت نشده"}</span>
            <div className={`w-9 h-5 rounded-full relative transition-colors`} style={{ backgroundColor: isPaid ? paidColor as string : "var(--muted)" }}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPaid ? "right-0.5" : "right-[18px]"}`} />
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={() => setDeleteOpen(true)}
            className={`flex-1 py-2.5 rounded-[10px] text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors`}
            style={{ backgroundColor: `${deleteColor}14`, color: deleteColor as string }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${deleteColor}1F`)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = `${deleteColor}14`)}>
            <Trash2 className="h-3.5 w-3.5" />
            حذف نوبت
          </button>
        </div>

        {/* Created at */}
        {createdAtTime && (
          <p className="text-[10px] text-muted-foreground/50 text-center mt-2" dir="ltr">
            Created at {createdAtTime}
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
            <AlertDialogDescription className="text-[11px]" style={{ color: `${deleteColor}B3` }}>
              آیا مطمئن هستید؟ این عمل غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { onDelete(booking.id); onClose(); }}
              className="text-[11px] font-semibold text-white" style={{ backgroundColor: deleteColor as string }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = deleteHover as string)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = deleteColor as string)}>
              بله، حذف
            </AlertDialogAction>
            <AlertDialogCancel className="bg-muted text-[11px] font-semibold border-0">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
