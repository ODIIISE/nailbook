"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, CalendarDays, Sparkles, Share2 } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { TornPaperCard } from "./torn-paper-card";
import { getTehranDateKey } from "@/lib/time";

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

function Barcode({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const bars = [2,1,3,1,2,1,1,3,1,2,1,3,1,1,2,1,3,1,2,1,1,3,1,2,1,3,1,2,1,1,3,1,2,1,3,1,1,2,1,3,1,2,1,1,3,1,2,1,3,1,2,1,1,3,1,2,1,3,1,1,2,1,3,1,2,1];
    bars.forEach((w) => {
      const bar = document.createElement("div");
      bar.style.cssText = `width:${w}px;height:${18+Math.random()*4}px;background:var(--foreground);border-radius:0.5px;opacity:0.08;`;
      ref.current!.appendChild(bar);
    });
  }, [id]);

  return (
    <div ref={ref} className="flex justify-center gap-[1px] h-[22px] items-end" />
  );
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
      <TornPaperCard>
        <div className="px-5 py-4">
          {/* Paper texture */}
          <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.025] mix-blend-multiply" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.25'/%3E%3C/svg%3E\")",
            backgroundSize: "180px 180px",
          }} />

          {/* Success indicator */}
          <div className="flex items-center gap-2.5 mb-4 relative z-[2]">
            <div
              className="w-8 h-8 rounded-full bg-success flex items-center justify-center shrink-0"
              style={{ boxShadow: "0 2px 8px rgba(34,197,94,0.2)" }}
            >
              <Check className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[14px] font-bold text-foreground">رزرو ثبت شد</div>
            </div>
          </div>

          {/* Service info */}
          <div className="flex items-center gap-2.5 mb-2 relative z-[2]">
            <div
              className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(40,136,208,0.06), rgba(91,179,228,0.03))" }}
            >
              <Sparkles className="h-4 w-4 text-[#2888d0]" />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-foreground">{serviceName}</div>
              <div className="text-[10px] text-muted-foreground">{salonName}</div>
            </div>
          </div>

          <div className="h-px bg-black/[0.04] mb-2 relative z-[2]" />

          {/* Detail list */}
          <div className="relative z-[2]">
            <div className="flex justify-between items-center py-[7px]">
              <span className="text-[12px] text-muted-foreground">تاریخ</span>
              <span className="text-[12px] font-semibold text-foreground">{fullDate}</span>
            </div>
            <div className="flex justify-between items-center py-[7px] border-t border-dashed border-black/[0.05]">
              <span className="text-[12px] text-muted-foreground">ساعت</span>
              <span className="text-[12px] font-semibold text-foreground">{formattedTime} تا {formattedEndTime}</span>
            </div>
            <div className="flex justify-between items-center py-[7px] border-t border-dashed border-black/[0.05]">
              <span className="text-[12px] text-muted-foreground">مدت</span>
              <span className="text-[12px] font-semibold text-foreground">{toPersianDigits(duration)} دقیقه</span>
            </div>
            <div className="flex justify-between items-center pt-2.5 pb-0.5 border-t border-dashed border-black/[0.05]">
              <span className="text-[12px] font-medium text-muted-foreground">هزینه کل</span>
              <span className="text-[16px] font-extrabold text-[#2888d0]">{formatPrice(Number(price))} تومان</span>
            </div>
          </div>

          {/* Barcode + tracking code */}
          <div className="mt-3 relative z-[2]">
            <Barcode id={bookingId} />
            <div className="text-center text-[10px] font-medium tracking-[1px] text-foreground/20 mt-1.5" dir="ltr">
              #{shortId}
            </div>
            <div className="text-center text-[7px] font-medium tracking-[2px] text-muted-foreground opacity-30 mt-0.5">
              forehand.vercel.app
            </div>
          </div>
        </div>
      </TornPaperCard>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mt-3">
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
