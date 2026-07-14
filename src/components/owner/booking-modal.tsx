"use client";

import { useState, useRef, useEffect } from "react";
import { X, User, Phone, MessageSquare, Wrench, Calendar, Clock, DollarSign, CreditCard, ChevronDown, Check, Trash2 } from "lucide-react";
import { formatPrice, toPersianDigits, formatJalaliDateShort, gregorianToJalali } from "@/lib/jalali";
import { calculateBookingPrice } from "@/lib/pricing";
import type { Booking, Service, Addon } from "@/lib/types";

interface BookingModalProps {
  booking: Booking;
  services: Service[];
  addons: Addon[];
  isPaid: boolean;
  onTogglePaid: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: Booking["status"]; label: string; color: string }[] = [
  { value: "confirmed", label: "تایید شده", color: "#2E7D32" },
  { value: "in_progress", label: "در حال انجام", color: "#1565C0" },
  { value: "completed", label: "تکمیل شده", color: "#7B1FA2" },
];

export function BookingModal({ booking, services, addons, isPaid, onTogglePaid, onDelete, onClose }: BookingModalProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(booking.status);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-[340px] bg-white/95 backdrop-blur-2xl rounded-[20px] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] animate-scale">
        {/* Header */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-bold">جزئیات نوبت</h2>
            <span className="text-[10px] font-semibold text-muted-foreground bg-black/[0.04] px-2 py-0.5 rounded-md" dir="ltr">{shortId}</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-black/[0.04] flex items-center justify-center">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
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
          {/* Service */}
          <div className="flex items-center justify-between py-[7px] border-b border-black/[0.04]">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-black/[0.03] flex items-center justify-center">
                <Wrench className="h-[11px] w-[11px] text-black/40" />
              </div>
              <span className="text-[12px] text-muted-foreground font-medium">خدمت</span>
            </div>
            <span className="text-[12px] font-bold">{booking.service?.name || "نامعلوم"}</span>
          </div>

          {/* Addons */}
          {selectedAddons.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap py-1.5 pr-7 border-b border-black/[0.04]">
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
            <span className="text-[12px] font-medium text-muted-foreground">{formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd)} {toPersianDigits(booking.created_at.slice(11, 16))}</span>
          </div>
        </div>

        {/* Status + Payment */}
        <div className="flex gap-2 mb-3">
          {/* Status Dropdown */}
          <div className="flex-1 relative" ref={dropdownRef}>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="w-full flex items-center justify-between px-2.5 py-[9px] rounded-[10px] border border-black/[0.08] bg-white text-[12px] font-semibold"
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.color }} />
                <span>{statusConfig.label}</span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${statusOpen ? "rotate-180" : ""}`} />
            </button>
            {statusOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-black/[0.06] overflow-hidden z-20">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setCurrentStatus(opt.value); setStatusOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium hover:bg-black/[0.03] ${currentStatus === opt.value ? "bg-black/[0.04] font-bold" : ""}`}
                  >
                    <div className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: opt.color }} />
                    <span>{opt.label}</span>
                    {currentStatus === opt.value && <Check className="h-3.5 w-3.5 text-[#2E7D32] mr-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

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
        </div>

        {/* Buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => { onDelete(booking.id); onClose(); }}
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
      </div>
    </div>
  );
}
