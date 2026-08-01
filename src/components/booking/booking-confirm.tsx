"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2, Repeat, Image as ImageIcon, Loader2 } from "lucide-react";
import { toPersianDigits, gregorianToJalali, PERSIAN_MONTHS } from "@/lib/jalali";
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
  const dateParts = useMemo(
    () => ({
      day: jalali.jd,
      month: PERSIAN_MONTHS[jalali.jm - 1],
      year: jalali.jy,
    }),
    [jalali.jd, jalali.jm, jalali.jy]
  );
  const shortId = bookingId.slice(-4).toUpperCase();

  const [h, m] = time.split(":").map(Number);
  const endMinutes = h * 60 + m + duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  const shareText = useMemo(
    () =>
      `رزرو ناخن ثبت شد!\n${serviceName}\n${toPersianDigits(dateParts.day)} ${dateParts.month} ${toPersianDigits(dateParts.year)} - ساعت ${toPersianDigits(time)} تا ${toPersianDigits(endTime)}\n${salonName}${salonAddress ? `\n${salonAddress}` : ""}`,
    [serviceName, dateParts.day, dateParts.month, dateParts.year, time, endTime, salonName, salonAddress]
  );

  const sharePath = bookingIdRaw ? `/bookings/${bookingIdRaw}` : "/book";

  const receiptRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const createReceiptBlob = useCallback(async () => {
    if (!receiptRef.current) return null;
    await document.fonts?.ready;
    const { toBlob } = await import("html-to-image");
    return toBlob(receiptRef.current, {
      backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#fafafa",
      pixelRatio: 2,
      cacheBust: true,
    });
  }, []);

  const downloadBlob = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `receipt-${shortId}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [shortId]);

  const handleDownloadImage = useCallback(async () => {
    if (isCapturing) return;
    haptic.tap();
    setIsCapturing(true);
    try {
      const blob = await createReceiptBlob();
      if (!blob) throw new Error("receipt-image-empty");
      downloadBlob(blob);
      toast.success("تصویر رسید دانلود شد");
    } catch {
      toast.error("خطا در ایجاد تصویر رسید");
    } finally {
      setIsCapturing(false);
    }
  }, [createReceiptBlob, downloadBlob, isCapturing]);

  const handleShare = useCallback(async () => {
    if (isCapturing) return;
    haptic.tap();
    setIsCapturing(true);
    try {
      const blob = await createReceiptBlob();
      if (!blob) throw new Error("receipt-image-empty");
      const file = new File([blob], `receipt-${shortId}.png`, { type: "image/png" });
      const shareUrl = new URL(sharePath, window.location.origin).toString();
      const shareData = {
        title: `رزرو ${salonName}`,
        text: shareText,
        url: shareUrl,
        files: [file],
      };

      let canShareFile = false;
      try {
        canShareFile = typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
      } catch {
        canShareFile = false;
      }

      if (canShareFile) {
        await navigator.share(shareData);
      } else if (typeof navigator.share === "function") {
        // Some browsers support text/link sharing but reject files.
        await navigator.share({ title: shareData.title, text: shareText, url: shareUrl });
        downloadBlob(blob);
        toast.success("لینک و متن ارسال شد؛ تصویر رسید هم دانلود شد");
      } else {
        let copied = false;
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
            copied = true;
          } catch {
            // Private browsing or an insecure context may block the clipboard.
          }
        }
        // Download independently so the image is still delivered even when
        // clipboard permissions are unavailable.
        downloadBlob(blob);
        toast.success(copied ? "لینک و متن کپی شد و تصویر رسید دانلود شد" : "تصویر رسید دانلود شد");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("اشتراک‌گذاری انجام نشد");
      }
    } finally {
      setIsCapturing(false);
    }
  }, [createReceiptBlob, downloadBlob, isCapturing, salonName, sharePath, shareText, shortId]);

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
          dateParts={dateParts}
          startTime={time}
          endTime={endTime}
          totalDuration={duration}
          totalPrice={price}
          bookingId={bookingId}
          bookingIdRaw={bookingIdRaw}
          customerName={customerName}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="xl" variant="paper" className="w-full" onClick={handleDownloadImage} disabled={isCapturing}>
          {isCapturing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <ImageIcon className="h-4 w-4 ml-2" />}
          {isCapturing ? "در حال آماده‌سازی..." : "دانلود تصویر"}
        </Button>
        <Button size="xl" variant="outline" className="w-full bg-background" onClick={handleShare} disabled={isCapturing}>
          {isCapturing ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Share2 className="h-4 w-4 ml-2" />}
          اشتراک‌گذاری
        </Button>
      </div>

      <div className="mt-2">
        <Button size="xl" variant="ghost" className="w-full" onClick={handleRebook} disabled={isCapturing}>
          <Repeat className="h-4 w-4 ml-2" />
          رزرو مجدد
        </Button>
      </div>
    </div>
  );
}
