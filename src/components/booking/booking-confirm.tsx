"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { CheckCircle2, CalendarDays, Clock, Timer, CreditCard, Hash, Share2, MessageCircle, ArrowRight } from "lucide-react";
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

  // Calculate end time
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
    const text = `رزرو ناخن تایید شد!\n${serviceName}\n${fullDate} - ساعت ${formattedTime}\n${salonName}`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="mx-auto max-w-lg animate-scale">
      {/* Success Header */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success/10 relative">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <div className="absolute inset-0 rounded-full border-2 border-success/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        <h2 className="text-h1 text-foreground mb-1">رزرو تایید شد!</h2>
        <p className="text-[14px] text-muted-foreground">
          {customerName} عزیز، نوبت شما با موفقیت ثبت شد
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="glass rounded-2xl overflow-hidden mb-5">
        {/* Service Header */}
        <div className="px-5 py-4 border-b border-black/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--rose)]/10 flex items-center justify-center">
              <span className="text-lg">💅</span>
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-foreground">{serviceName}</div>
              <div className="text-[12px] text-muted-foreground">{salonName}</div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="px-5 py-4 space-y-3">
          {/* Date & Time — Combined row */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02]">
            <div className="w-8 h-8 rounded-lg bg-[var(--rose)]/10 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-[var(--rose)]" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-foreground">{fullDate}</div>
              <div className="text-[12px] text-muted-foreground">ساعت {formattedTime} تا {formattedEndTime}</div>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02]">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Timer className="h-4 w-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-foreground">{toPersianDigits(duration)} دقیقه</div>
              <div className="text-[12px] text-muted-foreground">مدت زمان خدمت</div>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02]">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <CreditCard className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold text-foreground">{formatPrice(Number(price))} تومان</div>
              <div className="text-[12px] text-muted-foreground">هزینه کل</div>
            </div>
          </div>

          {/* Tracking Code */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-black/[0.02]">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Hash className="h-4 w-4 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-foreground font-mono" dir="ltr">#{shortId}</div>
              <div className="text-[12px] text-muted-foreground">کد رهگیری</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <Button size="xl" className="w-full" onClick={handleAddToGoogleCalendar}>
          <CalendarDays className="h-4 w-4 ml-2" />
          افزودن به تقویم گوگل
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button size="lg" variant="outline" className="w-full" onClick={handleShare}>
            <Share2 className="h-4 w-4 ml-1.5" />
            اشتراک‌گذاری
          </Button>
          {isValidIranianPhone(phone) && (
            <a
              href={`https://wa.me/98${phone.slice(1)}?text=${encodeURIComponent(`رزرو نوبت ناخن\n${serviceName}\n${fullDate} ساعت ${formattedTime}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full border-green-500/30 text-green-600 hover:bg-green-50"
              )}
            >
              <MessageCircle className="h-4 w-4 ml-1.5" />
              واتساپ
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
