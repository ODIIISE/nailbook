"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { X, User, Phone, Clock, CreditCard } from "lucide-react";
import { toPersianDigits, formatJalaliDateShort, gregorianToJalali } from "@/lib/jalali";
import type { Booking } from "@/lib/mock-data";

interface BookingModalProps {
  booking: Booking;
  isPaid: boolean;
  onTogglePaid: () => void;
  onClose: () => void;
}

export function BookingModal({ booking, isPaid, onTogglePaid, onClose }: BookingModalProps) {
  const jalali = gregorianToJalali(new Date(booking.date_gregorian));
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const price = booking.service?.price || 0;
  const duration = booking.service?.duration_minutes || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm glass rounded-3xl p-6 animate-scale">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 text-foreground">جزئیات نوبت</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground">{booking.customer_name}</p>
              <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span dir="ltr">{toPersianDigits(booking.customer_phone)}</span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">خدمت</span>
              <span className="text-[15px] font-bold">{booking.service?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">تاریخ</span>
              <span className="text-[15px] font-bold">{shortDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">ساعت</span>
              <span className="text-[15px] font-bold">
                {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground">مدت</span>
              <span className="text-[15px] font-bold">{toPersianDigits(duration)} دقیقه</span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-[15px] font-bold text-foreground">
                {toPersianDigits(price.toLocaleString("fa-IR"))} تومان
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-[15px] text-foreground">پرداخت شده</span>
            <Switch checked={isPaid} onCheckedChange={onTogglePaid} />
          </div>

          <div className="mt-2">
            <Badge variant={isPaid ? "default" : "secondary"}>
              {isPaid ? "پرداخت شده" : "پرداخت نشده"}
            </Badge>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-4" onClick={onClose}>
          بستن
        </Button>
      </div>
    </div>
  );
}
