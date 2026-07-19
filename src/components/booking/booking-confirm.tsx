"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, CalendarDays, Timer, CreditCard, Hash, Share2 } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { getTehranDateKey } from "@/lib/time";
import { ReceiptCard, ReceiptRow, ReceiptTotal } from "./receipt-card";

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
    const tehranKey = getTehranDateKey(date);
    const [year, month, day] = tehranKey.split("-");
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

      {/* Receipt Card */}
      <ReceiptCard className="mb-5">
        {/* Service Header */}
        <div className="flex items-center gap-3 pb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2888d0]/8 flex items-center justify-center shrink-0">
            <span className="text-2xl">💅</span>
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-bold text-foreground">{serviceName}</div>
            <div className="text-[12px] text-muted-foreground">{salonName}</div>
          </div>
          <div className="text-[10px] text-success font-semibold bg-success/10 px-2 py-1 rounded-md">
            ثبت شده
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1">
          <ReceiptRow
            icon={<CalendarDays className="h-4 w-4" />}
            label="تاریخ"
            value={fullDate}
            subValue={`ساعت ${formattedTime} تا ${formattedEndTime}`}
          />
          <ReceiptRow
            icon={<Timer className="h-4 w-4" />}
            label="مدت"
            value={`${toPersianDigits(duration)} دقیقه`}
          />
          <ReceiptRow
            icon={<Hash className="h-4 w-4" />}
            label="کد رهگیری"
            value={`#${shortId}`}
            iconBg="rgba(147,51,234,0.08)"
            iconColor="#9333ea"
          />
        </div>

        {/* Total */}
        <ReceiptTotal
          label="هزینه کل"
          amount={formatPrice(Number(price))}
        />
      </ReceiptCard>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button size="xl" variant="paper" className="w-full" onClick={handleAddToGoogleCalendar}>
          <CalendarDays className="h-4 w-4 ml-2" />
          تقویم گوگل
        </Button>
        <Button size="xl" variant="outline" className="w-full bg-white" onClick={handleShare}>
          <Share2 className="h-4 w-4 ml-2" />
          اشتراک‌گذاری
        </Button>
      </div>
    </div>
  );
}
