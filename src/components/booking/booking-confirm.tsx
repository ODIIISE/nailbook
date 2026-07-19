"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle2, CalendarDays, Timer, CreditCard, Hash, Share2 } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { isValidIranianPhone } from "@/lib/digits";
import { cn } from "@/lib/utils";

interface BookingConfirmProps {
  serviceName: string;
  date: Date;
  time: string;
  duration: number;
  price: number;
  customerName: string;
  bookingId: string;
  salonName?: string;
  salonAddress?: string;
  phone?: string;
}

export function BookingConfirm({
  serviceName,
  date,
  time,
  duration,
  price,
  customerName,
  bookingId,
  salonName = "",
  salonAddress = "",
  phone = "",
}: BookingConfirmProps) {
  const jalali = gregorianToJalali(date);
  const fullDate = formatJalaliDate(jalali.jy, jalali.jm, jalali.jd);
  const formattedTime = toPersianDigits(time);
  const shortId = bookingId.slice(-4).toUpperCase();

  const [h, m] = time.split(":").map(Number);
  const endMinutes = h * 60 + m + duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  const formattedEndTime = toPersianDigits(endTime);

  const handleAddToGoogleCalendar = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const startStr = `${year}${month}${day}T${pad(h)}${pad(m)}00`;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endStr = `${year}${month}${day}T${pad(endH)}${pad(endM)}00`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${serviceName} - ${salonName}`,
      dates: `${startStr}/${endStr}`,
      details: `رزرو شماره: ${shortId}\nهزینه: ${formatPrice(Number(price))} تومان\nنام: ${customerName}`,
      location: salonAddress,
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");
  };

  const handleShare = async () => {
    const text = `رزرو ناخن ثبت شد!\n${serviceName}\n${fullDate} - ساعت ${formattedTime}\n${salonName}`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="mx-auto max-w-lg animate-scale">
      {/* Success Header */}
      <div className="text-center mb-5">
        <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 relative">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <div className="absolute inset-0 rounded-full border-2 border-success/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
          <span className="text-[14px] font-bold text-success">رزرو ثبت شد</span>
        </div>
        <p className="text-[13px] text-muted-foreground mt-2">
          {customerName} عزیز، نوبت شما ثبت شد
        </p>
      </div>

      {/* Receipt Card — matches step 4 pre-receipt style */}
      <div className="glass rounded-2xl overflow-hidden mb-5 relative">
        {/* Dashed top edge */}
        <div className="h-0 border-t-2 border-dashed border-black/[0.06] mx-4" />

        {/* Service Header */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[var(--rose)]/10 flex items-center justify-center shrink-0">
              <span className="text-xl">💅</span>
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-foreground">{serviceName}</div>
              <div className="text-[12px] text-muted-foreground">{salonName}</div>
            </div>
            <div className="text-[11px] text-[var(--rose)] font-semibold bg-[var(--rose)]/10 px-2 py-1 rounded-md">
              ثبت شده
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="h-0 border-t border-dashed border-black/[0.06] mx-5" />

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          {/* Date & Time */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--rose)]/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-[var(--rose)]" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-foreground">{fullDate}</div>
              <div className="text-[11px] text-muted-foreground">ساعت {formattedTime} تا {formattedEndTime}</div>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-[13px] font-semibold text-foreground">{toPersianDigits(duration)} دقیقه</div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-extrabold text-foreground">
                {formatPrice(Number(price))} <span className="text-[13px] font-medium text-muted-foreground">تومان</span>
              </div>
            </div>
          </div>

          {/* Tracking Code */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Hash className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-muted-foreground">کد رهگیری</div>
            </div>
            <div className="text-[13px] font-semibold text-foreground font-mono">#{shortId}</div>
          </div>
        </div>

        {/* Dashed bottom edge */}
        <div className="h-0 border-t-2 border-dashed border-black/[0.06] mx-4" />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button size="xl" className="w-full" onClick={handleAddToGoogleCalendar}>
          <CalendarDays className="h-4 w-4 ml-2" />
          تقویم گوگل
        </Button>
        <Button size="xl" variant="outline" className="w-full" onClick={handleShare}>
          <Share2 className="h-4 w-4 ml-2" />
          اشتراک‌گذاری
        </Button>
      </div>
    </div>
  );
}
