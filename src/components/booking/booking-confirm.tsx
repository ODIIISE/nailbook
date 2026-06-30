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
}

export function BookingConfirm({
  serviceName,
  date,
  time,
  duration,
  price,
  customerName,
  bookingId,
}: BookingConfirmProps) {
  const jalali = gregorianToJalali(date);
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const formattedTime = formatJalaliTime(time);
  const shortId = bookingId.slice(-4).toUpperCase();

  const handleAddToCalendar = () => {
    const [h, m] = time.split(":").map(Number);
    const start = new Date(date);
    start.setHours(h, m, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);

    const formatCalDate = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatCalDate(start)}
DTEND:${formatCalDate(end)}
SUMMARY:${serviceName} - ناخن‌های سوفی
DESCRIPTION:رزرو شماره ${shortId}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `booking-${shortId}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = `رزرو ناخن تایید شد! 💅\n${serviceName}\n${shortDate} - ساعت ${formattedTime}\nناخن‌های سوفی`;
    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-6 text-center">
      <div className="mb-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-foreground mb-1">رزرو شما تایید شد!</h2>
      <p className="text-sm text-muted-foreground mb-6">
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
            <span className="font-bold text-navy">
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
          variant="outline"
          className="w-full"
          onClick={handleAddToCalendar}
        >
          <Calendar className="h-4 w-4 ml-2" />
          افزودن به تقویم
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
          href={`https://wa.me/989121234567?text=${encodeURIComponent(`رزرو نوبت ناخن\n${serviceName}\n${shortDate} ساعت ${formattedTime}`)}`}
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
