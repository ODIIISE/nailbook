"use client";

import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, Share2, MessageCircle } from "lucide-react";
import { formatJalaliDateShort, formatJalaliTime, toPersianDigits, gregorianToJalali } from "@/lib/jalali";
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
  salonName = "استدیو تخصصی ناخن فورهند",
  salonAddress = "مشهد، نبش صارمی ۳۸/۱۲، پلاک ۷۷",
  phone = "09308681363",
}: BookingConfirmProps) {
  const jalali = gregorianToJalali(date);
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const formattedTime = formatJalaliTime(time);
  const shortId = bookingId.slice(-4).toUpperCase();

  const handleAddToGoogleCalendar = () => {
    const [h, m] = time.split(":").map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    const formatGCDate = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    };

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${serviceName} - ${salonName}`,
      dates: `${formatGCDate(start)}/${formatGCDate(end)}`,
      details: `رزرو شماره: ${shortId}\nهزینه: ${toPersianDigits(price.toLocaleString("fa-IR"))} تومان\nنام: ${customerName}`,
      location: salonAddress,
    });

    const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
    window.open(url, "_blank");
  };

  const handleShare = async () => {
    const text = `رزرو ناخن تایید شد!\n${serviceName}\n${shortDate} - ساعت ${formattedTime}\n${salonName}`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-6 text-center animate-spring">
      <div className="mb-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 animate-spring">
          <CheckCircle className="h-10 w-10 text-success" />
        </div>
      </div>

      <h2 className="text-h2 text-foreground mb-1">رزرو شما تایید شد!</h2>
      <p className="text-body text-muted-foreground mb-6">
        {customerName} عزیز، نوبت شما ثبت شد
      </p>

      <Card className="p-4 mb-6 text-right">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">خدمت</span>
            <span className="font-semibold">{serviceName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاریخ</span>
            <span className="font-semibold">{shortDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">ساعت</span>
            <span className="font-semibold">{formattedTime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">مدت</span>
            <span className="font-semibold">{toPersianDigits(duration)} دقیقه</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2">
            <span className="text-muted-foreground">هزینه</span>
            <span className="font-bold text-primary">
              {toPersianDigits(price.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t">
          <Badge variant="outline" className="text-xs">
            کد رهگیری: #{shortId}
          </Badge>
        </div>
      </Card>

      <div className="space-y-3">
        <Button
          className="w-full"
          onClick={handleAddToGoogleCalendar}
        >
          <Calendar className="h-4 w-4 ml-2" />
          افزودن به تقویم گوگل
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 ml-2" />
          اشتراک‌گذاری
        </Button>
        <a
          href={`https://wa.me/98${phone.slice(1)}?text=${encodeURIComponent(`رزرو نوبت ناخن\n${serviceName}\n${shortDate} ساعت ${formattedTime}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full border-green-500/30 text-green-600 hover:bg-green-50"
          )}
        >
          <MessageCircle className="h-4 w-4 ml-2" />
          پیام در واتساپ
        </a>
      </div>
    </Card>
  );
}
