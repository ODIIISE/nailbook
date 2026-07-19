"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, CalendarDays, Sparkles, Share2 } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
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
      {/* ═══ TOP STUB ═══ */}
      <div className="relative z-[2] mb-[-2px]">
        <div
          className="rounded-t-[10px] px-5 py-2 relative overflow-hidden"
          style={{
            background: "var(--card)",
            boxShadow: "0 1px 3px rgba(80,70,60,0.06), 0 2px 8px rgba(60,50,40,0.04)",
          }}
        >
          <Barcode id={bookingId} />
          <div className="text-center text-[7px] font-medium tracking-[2px] text-muted-foreground opacity-30 mt-0.5">
            forehand.vercel.app
          </div>
        </div>
        <div className="h-[4px] relative overflow-hidden" style={{ background: "var(--card)" }}>
          <div
            className="absolute bottom-0 left-0 right-0 h-[4px]"
            style={{
              backgroundImage: "repeating-conic-gradient(var(--card) 0% 25%, transparent 0% 50%)",
              backgroundSize: "7px 7px",
              backgroundPosition: "50% 0",
            }}
          />
        </div>
      </div>

      {/* ═══ PERFORATION ═══ */}
      <div className="flex justify-center gap-[6px] py-[3px] relative z-[3]">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="w-[2.5px] h-[2.5px] rounded-full"
            style={{
              background: "var(--background)",
              boxShadow: "inset 0 0.5px 1px rgba(0,0,0,0.1)",
            }}
          />
        ))}
      </div>

      {/* ═══ MAIN CARD ═══ */}
      <div className="relative z-[1]">
        <div className="h-[4px] relative overflow-hidden" style={{ background: "var(--card)", transform: "rotate(180deg)" }}>
          <div
            className="absolute bottom-0 left-0 right-0 h-[4px]"
            style={{
              backgroundImage: "repeating-conic-gradient(var(--card) 0% 25%, transparent 0% 50%)",
              backgroundSize: "7px 7px",
              backgroundPosition: "50% 0",
            }}
          />
        </div>

        <div
          className="rounded-b-[10px] px-5 py-4 relative overflow-hidden"
          style={{
            background: "var(--card)",
            boxShadow: "0 1px 3px rgba(80,70,60,0.05), 0 3px 10px rgba(60,50,40,0.04), 0 6px 20px rgba(50,40,30,0.035), 0 12px 40px rgba(50,40,30,0.025)",
          }}
        >
          {/* Paper texture */}
          <div className="absolute inset-0 pointer-events-none z-[1] opacity-[0.025] mix-blend-multiply" style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.25'/%3E%3C/svg%3E\")",
            backgroundSize: "180px 180px",
          }} />

          {/* Top edge highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] z-[2] pointer-events-none" style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
          }} />

          {/* FOREHAND watermark — subtle */}
          <div
            className="absolute left-1 top-0 bottom-0 z-0 pointer-events-none select-none flex items-center justify-center"
            style={{
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontSize: "36px",
              fontWeight: 900,
              letterSpacing: "5px",
              color: "var(--foreground)",
              opacity: 0.02,
            }}
          >
            FOREHAND
          </div>

          {/* Success indicator — compact */}
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

          {/* Service info — compact */}
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

          {/* Detail list — compact classic receipt */}
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
        </div>
      </div>

      {/* ═══ ACTIONS ═══ */}
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
