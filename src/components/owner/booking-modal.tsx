"use client";

import { useState } from "react";
import { User, Phone, MessageSquare, Wrench, Calendar, Clock, DollarSign, CreditCard, ChevronDown, Check, Trash2, AlertTriangle } from "lucide-react";
import { formatPrice, toPersianDigits, formatJalaliDateShort, gregorianToJalali } from "@/lib/jalali";
import { calculateBookingPrice } from "@/lib/pricing";
import { STATUS_CONFIG } from "@/lib/constants";
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

  const jalali = gregorianToJalali(new Date(booking.date_gregorian));
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const price = calculateBookingPrice(booking, services, addons);

  const startMinutes = parseInt(booking.start_time.split(":")[0]) * 60 + parseInt(booking.start_time.split(":")[1]);
  const endMinutes = parseInt(booking.end_time.split(":")[0]) * 60 + parseInt(booking.end_time.split(":")[1]);
  const duration = endMinutes - startMinutes;

  const selectedAddons = (booking.selected_addons || [])
    .map((id) => addons.find((a) => a.id === id))
    .filter(Boolean);

  const statusConfig = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];
  const shortId = `BK-${booking.id.slice(-6).toUpperCase()}`;
  const createdAtTime = booking.created_at ? new Date(booking.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[340px] bg-white/95 backdrop-blur-2xl rounded-[20px] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-0 border-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-bold">جزئیات نوبت</h2>
            <span className="text-[10px] font-semibold text-muted-foreground bg-black/[0.04] px-2 py-0.5 rounded-md" dir="ltr">{shortId}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
            <svg className="h-3.5 w-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Customer */}
        <div className="flex items-center justify-between p-2.5 bg-black/[0.02] rounded-xl mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-black/[0.05] flex items-center justify-center">
              <User className="h-4 w-4 text-black/35" />
            </div>
            <div>
              <div className="text-[13px] font-bold">{booking.customer_name}</div>
              <div className="text-[11px] text-muted-foreground mt-px" dir="ltr">{toPersianDigits(booking.customer_phone)}</div>
            </div>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => window.open(`sms:${booking.customer_phone}`, "_self")}
              className="w-8 h-8 rounded-lg border border-black/[0.06] bg-white flex items-center justify-center"
            >
              <MessageSquare className="h-3.5 w-3.5 text-[#7B1FA2]" />
            </button>
            <button
              onClick={() => window.open(`tel:${booking.customer_phone}`, "_self")}
              className="w-8 h-8 rounded-lg border border-black/[0.06] bg-white flex items-center justify-center"
            >
              <Phone className="h-3.5 w-3.5 text-[#1565C0]" />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="mb-3">
          {/* Service + Addons */}
          <div className="py-[7px] border-b border-black/[0.04]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-md bg-black/[0.03] flex items-center justify-center">
                  <Wrench className="h-[11px] w-[11px] text-black/40" />
                </div>
                <span className="text-[12px] text-muted-foreground font-medium">خدمت</span>
              </div>
              <span className="text-[12px] font-bold">{booking.service?.name || "نامعلوم"}</span>
            </div>
            {selectedAddons.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5 pr-7.5">
                {selectedAddons.slice(0, 2).map((addon) => (
                  <span key={addon!.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-[#7B1FA2]/[0.06] text-[10px] font-semibold text-[#7B1FA2]">
                    {addon!.name}
                  </span>
                ))}
                {selectedAddons.length > 2 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] bg-black/[0.04] text-[10px] font-semibold text-muted-foreground">
                    +{toPersianDigits(selectedAddons.length - 2)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Date + Time */}
          <div className="flex items-center justify-between py-[7px] border-b border-black/[0.04]">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-[#1976D2]/[0.08] flex items-center justify-center">
                <Calendar className="h-[11px] w-[11px] text-[#1976D2]" />
              </div>
              <span className="text-[12px] text-muted-foreground font-medium">تاریخ و ساعت</span>
            </div>
            <span className="text-[12px] font-bold">{shortDate} · {toPersianDigits(booking.start_time.slice(0, 5))} – {toPersianDigits(booking.end_time.slice(0, 5))}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between py-[7px] border-b border-black/[0.04]">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-black/[0.03] flex items-center justify-center">
                <Clock className="h-[11px] w-[11px] text-black/40" />
              </div>
              <span className="text-[12px] text-muted-foreground font-medium">مدت</span>
            </div>
            <span className="text-[12px] font-bold">{toPersianDigits(duration)} دقیقه</span>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between py-[7px] border-b border-black/[0.04]">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-[#E65100]/[0.08] flex items-center justify-center">
                <DollarSign className="h-[11px] w-[11px] text-[#E65100]" />
              </div>
              <span className="text-[12px] text-muted-foreground font-medium">هزینه</span>
            </div>
            <span className="text-[12px] font-bold text-[#E65100]">{formatPrice(Number(price))} تومان</span>
          </div>

          {/* Created */}
          <div className="flex items-center justify-between py-[7px]">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-black/[0.03] flex items-center justify-center">
                <Clock className="h-[11px] w-[11px] text-black/30" />
              </div>
              <span className="text-[12px] text-muted-foreground font-medium">ثبت شده</span>
            </div>
            <span className="text-[12px] font-medium text-muted-foreground">{shortDate} {createdAtTime}</span>
          </div>
        </div>

        {/* Payment + Status */}
        <div className="flex gap-2 mb-3">
          {/* Payment */}
          <div className="flex-1 flex items-center justify-between px-3 py-[9px] bg-black/[0.02] rounded-[10px]">
            <span className="text-[12px] font-semibold flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5 text-black/35" />
              پرداخت
            </span>
            <button
              onClick={onTogglePaid}
              className={`w-9 h-5 rounded-full relative transition-colors ${isPaid ? "bg-[#2E7D32]" : "bg-black/10"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isPaid ? "right-0.5" : "right-[18px]"}`} />
            </button>
          </div>

          {/* Status DropdownMenu */}
          <div className="flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="w-full flex items-center justify-between px-2.5 py-[9px] rounded-[10px] border border-black/[0.08] bg-white text-[12px] font-semibold"
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.color }} />
                  <span>{statusConfig.label}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownContent statusOptions={STATUS_OPTIONS} currentStatus={currentStatus} onSelect={(value) => {
                setCurrentStatus(value as Booking["status"]);
                onStatusChange(value);
              }} />
            </DropdownMenu>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setDeleteOpen(true)}
            className="flex-1 py-2.5 rounded-[10px] bg-[#C62828]/[0.08] text-[#C62828] text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#C62828]/[0.12] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف نوبت
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[10px] bg-black/[0.04] text-[12px] font-semibold hover:bg-black/[0.06] transition-colors"
          >
            بستن
          </button>
        </div>
      </DialogContent>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[300px] bg-white/95 backdrop-blur-2xl rounded-[20px] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-0 border-0">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#C62828]">
              <AlertTriangle className="h-4 w-4" />
              حذف نوبت
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#C62828]/70 text-[11px]">
              آیا مطمئن هستید؟ این عمل غیرقابل بازگشت است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => { onDelete(booking.id); onClose(); }}
              className="bg-[#C62828] text-white text-[11px] font-semibold hover:bg-[#B71C1C]"
            >
              بله، حذف
            </AlertDialogAction>
            <AlertDialogCancel
              className="bg-black/[0.06] text-[11px] font-semibold hover:bg-black/[0.08] border-0"
            >
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function DropdownContent({ statusOptions, currentStatus, onSelect }: {
  statusOptions: { value: string; label: string; color: string }[];
  currentStatus: string;
  onSelect: (value: string) => void;
}) {
  return (
    <DropdownMenuContent align="start" sideOffset={4} className="min-w-0 w-full">
      {statusOptions.map((opt) => (
        <DropdownMenuItem
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={`gap-2 text-[12px] font-medium ${currentStatus === opt.value ? "bg-black/[0.04] font-bold" : ""}`}
        >
          <div className="w-[7px] h-[7px] rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
          <span>{opt.label}</span>
          {currentStatus === opt.value && <Check className="h-3.5 w-3.5 text-[#2E7D32] mr-auto" />}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );
}
