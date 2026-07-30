"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CalendarDays, Share2, MessageCircle, Copy, Repeat, Image as ImageIcon, Loader2 } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { getTehranDateKey } from "@/lib/time";
import { haptic } from "@/lib/haptics";
import { PrintedReceipt } from "./printed-receipt";
import type { Addon } from "@/lib/types";

interface BookingConfirmProps {
  serviceName: string;
  date: Date;
  time: string;
  duration: number;
  price: number;
  customerName: string;
  bookingId: string;
  bookingIdRaw?: string;
  salonName?: string;
  salonAddress?: string;
  phone?: string;
  salonLogoUrl?: string | null;
  addons?: Addon[];
  servicePrice?: number;
}

export function BookingConfirm({
  serviceName,
  date,
  time,
  duration,
  price,
  customerName,
  bookingId,
  bookingIdRaw,
  salonName = "",
  salonAddress = "",
  phone,
  salonLogoUrl,
  addons = [],
  servicePrice,
}: BookingConfirmProps) {
  const router = useRouter();
  const jalali = gregorianToJalali(date);
  const fullDate = formatJalaliDate(jalali.jy, jalali.jm, jalali.jd);
  const shortId = bookingId.slice(-4).toUpperCase();

  const [h, m] = time.split(":").map(Number);
  const endMinutes = h * 60 + m + duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;



  const handleAddToGoogleCalendar = () => {
    haptic.tap();
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
      ctz: "Asia/Tehran",
    });
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, "_blank");
  };

  const shareText = useMemo(
    () =>
      `رزرو ناخن ثبت شد!\n${serviceName}\n${fullDate} - ساعت ${toPersianDigits(time)} تا ${toPersianDigits(endTime)}\n${salonName}${salonAddress ? `\n${salonAddress}` : ""}`,
    [serviceName, fullDate, time, endTime, salonName, salonAddress]
  );

  const handleShare = async () => {
    haptic.tap();
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success("اطلاعات رزرو کپی شد");
      }
    } catch {
      // ignore
    }
  };

  const handleCopy = async () => {
    haptic.tap();
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success("اطلاعات رزرو کپی شد");
    } catch {
      // ignore
    }
  };

  const handleWhatsAppShare = () => {
    haptic.tap();
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
  };

  const receiptRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleShareImage = useCallback(async () => {
    if (!receiptRef.current || isCapturing) return;
    haptic.tap();
    setIsCapturing(true);
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(receiptRef.current, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#fafafa",
        pixelRatio: 2,
        cacheBust: true,
      });
      if (!blob) return;

      const file = new File([blob], `receipt-${shortId}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `receipt-${shortId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("تصویر رسید دانلود شد");
      }
    } catch {
      toast.error("خطا در ایجاد تصویر");
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, shortId, shareText]);

  const handleRebook = () => {
    haptic.tap();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-lg animate-scale">
      <div ref={receiptRef}>
        <PrintedReceipt
          mode="final"
          salonName={salonName}
          salonLogoUrl={salonLogoUrl}
          salonAddress={salonAddress}
          salonPhone={phone}
          serviceName={serviceName}
          servicePrice={servicePrice !== undefined ? servicePrice : price}
          addons={addons.map((a) => ({ name: a.name, price: Number(a.price) }))}
          dateLabel={fullDate}
          startTime={time}
          endTime={endTime}
          totalDuration={duration}
          totalPrice={price}
          bookingId={bookingId}
          bookingIdRaw={bookingIdRaw}
          customerName={customerName}
        />
      </div>

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

      <div className="grid grid-cols-2 gap-2 mt-2">
        <Button size="xl" variant="outline" className="w-full" onClick={handleWhatsAppShare}>
          <MessageCircle className="h-4 w-4 ml-2" />
          واتساپ
        </Button>
        <Button size="xl" variant="outline" className="w-full" onClick={handleCopy}>
          <Copy className="h-4 w-4 ml-2" />
          کپی اطلاعات
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <Button size="xl" variant="paper" className="w-full" onClick={handleShareImage} disabled={isCapturing}>
          {isCapturing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <ImageIcon className="h-4 w-4 ml-2" />}
          {isCapturing ? "در حال ایجاد..." : "اشتراک تصویری"}
        </Button>
        <Button size="xl" variant="secondary" className="w-full" onClick={handleRebook}>
          <Repeat className="h-4 w-4 ml-2" />
          رزرو مجدد
        </Button>
      </div>
    </div>
  );
}
