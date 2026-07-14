"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X, User, Phone, Clock, CreditCard, Trash2, CheckCircle, AlertTriangle } from "lucide-react";
import { formatPrice, toPersianDigits, formatJalaliDateShort, gregorianToJalali } from "@/lib/jalali";
import { calculateBookingPrice } from "@/lib/pricing";
import type { Booking, Service, Addon } from "@/lib/types";

interface BookingModalProps {
  booking: Booking;
  services: Service[];
  addons: Addon[];
  isPaid: boolean;
  onTogglePaid: () => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function BookingModal({ booking, services, addons, isPaid, onTogglePaid, onCancel, onDelete, onClose }: BookingModalProps) {
  const [confirmAction, setConfirmAction] = useState<"cancel" | "delete" | null>(null);

  const jalali = gregorianToJalali(new Date(booking.date_gregorian));
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const price = calculateBookingPrice(booking, services, addons);

  const startMinutes = parseInt(booking.start_time.split(":")[0]) * 60 + parseInt(booking.start_time.split(":")[1]);
  const endMinutes = parseInt(booking.end_time.split(":")[0]) * 60 + parseInt(booking.end_time.split(":")[1]);
  const duration = endMinutes - startMinutes;

  const isCancelled = booking.status === "cancelled";

  const handleConfirmAction = () => {
    if (confirmAction === "cancel") {
      onCancel(booking.id);
    } else if (confirmAction === "delete") {
      onDelete(booking.id);
    }
    setConfirmAction(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm glass rounded-3xl p-6 animate-scale max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-h2 text-foreground">جزئیات نوبت</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Customer info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-[17px] font-bold text-foreground">{booking.customer_name}</p>
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span dir="ltr">{toPersianDigits(booking.customer_phone)}</span>
            </div>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Details */}
        <div className="space-y-3 mb-4">
          <DetailRow label="خدمت" value={booking.service?.name || "نامعلوم"} />
          <DetailRow label="تاریخ" value={shortDate} />
          <DetailRow
            label="ساعت"
            value={`${toPersianDigits(booking.start_time.slice(0, 5))} تا ${toPersianDigits(booking.end_time.slice(0, 5))}`}
          />
          <DetailRow label="مدت" value={`${toPersianDigits(duration)} دقیقه`} />

          {booking.selected_addons && booking.selected_addons.length > 0 && (
            <DetailRow label="آپشن‌ها" value={`${toPersianDigits(booking.selected_addons.length)} مورد`} />
          )}

          <div className="flex items-center justify-between py-2">
            <span className="text-[13px] text-muted-foreground">هزینه</span>
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-[17px] font-bold text-foreground">
                {formatPrice(Number(price))} تومان
              </span>
            </div>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Payment toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[15px] text-foreground">پرداخت شده</span>
          <Switch checked={isPaid} onCheckedChange={onTogglePaid} />
        </div>

        {/* Confirmation dialog */}
        {confirmAction && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 animate-slideUp">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <p className="text-[13px] font-bold text-destructive">
                {confirmAction === "cancel" ? "لغو نوبت" : "حذف نوبت"}
              </p>
            </div>
            <p className="text-[12px] text-destructive/80 mb-3">
              {confirmAction === "cancel"
                ? "آیا مطمئن هستید که می‌خواهید این نوبت را لغو کنید؟"
                : "آیا مطمئن هستید که می‌خواهید این نوبت را حذف کنید؟ این عمل غیرقابل بازگشت است."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmAction}
                className="flex-1"
              >
                بله، {confirmAction === "cancel" ? "لغو" : "حذف"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmAction(null)}
                className="flex-1"
              >
                انصراف
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isCancelled && !confirmAction && (
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setConfirmAction("cancel")}
            >
              <AlertTriangle className="h-4 w-4 ml-2" />
              لغو نوبت
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setConfirmAction("delete")}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف نوبت
            </Button>
          </div>
        )}

        {isCancelled && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 mb-3">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">این نوبت لغو شده است</p>
          </div>
        )}

        <Button variant="outline" className="w-full mt-3" onClick={onClose}>
          بستن
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[15px] font-bold text-foreground">{value}</span>
    </div>
  );
}
