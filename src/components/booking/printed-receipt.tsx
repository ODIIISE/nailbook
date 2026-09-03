"use client";

import { useMemo, useState, useEffect } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { Check, MapPin, Phone } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";

interface AddonItem {
  name: string;
  price: number;
}

interface PrintedReceiptProps {
  /** preview = before final submit, final = confirmed receipt */
  mode: "preview" | "final";
  salonName: string;
  salonLogoUrl?: string | null;
  salonAddress?: string;
  salonPhone?: string;
  serviceName: string;
  servicePrice: number;
  addons: AddonItem[];
  dateParts: {
    day: number;
    month: string;
    year: number;
  };
  startTime: string;
  endTime: string;
  totalDuration: number;
  totalPrice: number;
  bookingId?: string;
  bookingIdRaw?: string;
  customerName?: string;
  className?: string;
}

function BookingQrCode({
  bookingId,
  label,
}: {
  bookingId: string;
  label?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      try {
        const url = `${window.location.origin}/bookings/${bookingId}`;
        const data = await QRCode.toDataURL(url, {
          width: 120,
          margin: 2,
        });
        if (!cancelled) setDataUrl(data);
      } catch {
        if (!cancelled) {
          setDataUrl(null);
          setError(true);
        }
      }
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative rounded-xl border border-border bg-card p-2 shadow-sm">
        {dataUrl ? (
          <Image
            src={dataUrl}
            alt={label || "QR code"}
            width={120}
            height={120}
            unoptimized
            className="block h-[120px] w-[120px]"
          />
        ) : error ? (
          <div className="flex h-[120px] w-[120px] items-center justify-center rounded bg-muted text-center text-small leading-5 text-muted-foreground">
            خطا در ساخت QR
          </div>
        ) : (
          <div className="h-[120px] w-[120px] rounded bg-muted" />
        )}
      </div>
      {label && (
        <span className="text-small font-medium text-muted-foreground tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}

export function PrintedReceipt({
  mode,
  salonName,
  salonLogoUrl,
  salonAddress,
  salonPhone,
  serviceName,
  servicePrice,
  addons,
  dateParts,
  startTime,
  endTime,
  totalDuration,
  totalPrice,
  bookingId,
  bookingIdRaw,
  customerName,
  className = "",
}: PrintedReceiptProps) {
  const isFinal = mode === "final";
  const displayId = bookingId ? bookingId.slice(-8).toUpperCase() : null;
  const issueDate = useMemo(
    () =>
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date()),
    []
  );

  const items = [{ name: serviceName, qty: 1, price: servicePrice }];
  addons.forEach((addon) => {
    items.push({ name: addon.name, qty: 1, price: addon.price });
  });

  const dateDay = toPersianDigits(dateParts.day);
  const dateMonth = dateParts.month;
  const dateYear = toPersianDigits(dateParts.year);
  const accessibleDateTime = `تاریخ ${dateDay} ${dateMonth} ${dateYear}، ساعت ${toPersianDigits(startTime)} تا ${toPersianDigits(endTime)}`;

  return (
    <article
      className={`relative mx-auto max-w-md ${className}`}
      aria-label={isFinal ? "رسید نهایی رزرو" : "پیش‌فاکتور رزرو"}
    >
      <div className="rounded-2xl border border-border bg-card shadow-card">
        <div
          className="relative overflow-hidden rounded bg-transparent px-5 py-5"
        >
          {/* Subtle paper grain */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03] mix-blend-multiply"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
              backgroundSize: "150px 150px",
            }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {salonLogoUrl ? (
                <Image
                  src={salonLogoUrl}
                  alt={salonName}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <span className="text-xs font-bold text-foreground">FN</span>
                </div>
              )}
              <div>
                <div className="text-sm font-bold text-foreground">{salonName}</div>
                <div className="text-small font-medium text-muted-foreground">
                  رسید رزرو
                </div>
              </div>
            </div>
            {displayId ? (
              <div className="text-left" dir="ltr">
                <div className="text-small font-medium tabular-nums tracking-wide text-muted-foreground">
                  #{displayId}
                </div>
                <div className="mt-0.5 text-small tabular-nums text-muted-foreground/70">
                  {issueDate}
                </div>
              </div>
            ) : (
              <div className="text-left">
                <div className="text-small font-medium text-muted-foreground/70">
                  پیش‌فاکتور
                </div>
                <div className="mt-0.5 text-small tabular-nums text-muted-foreground/70">
                  {issueDate}
                </div>
              </div>
            )}
          </div>

          {/* Status badge */}
          <div className="relative z-10 mt-4 text-center">
            <div
              className={`relative inline-flex items-center gap-1.5 isolate rounded-full px-3 py-1 text-xs font-semibold ${
                isFinal
                  ? "bg-success/10 text-success"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isFinal ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  رزرو ثبت شد
                </>
              ) : (
                <>پیش‌فاکتور</>
              )}
            </div>
            <h2 className="mt-2 text-2xl font-extrabold text-foreground">
              {isFinal ? "ممنون از اعتماد شما!" : "آماده رزرو"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isFinal
                ? "رزرو شما با موفقیت ثبت گردید."
                : "لطفاً جزئیات زیر را بررسی و تأیید کنید."}
            </p>
          </div>

          {/* Reference */}
          {isFinal && bookingId && (
            <div className="relative z-10 mt-4 text-center">
              <span className="text-xs text-muted-foreground">شماره رزرو:</span>
              <span
                className="mr-1 inline-block select-all text-sm font-bold tabular-nums tracking-widest text-primary"
                dir="ltr"
              >
                {bookingId}
              </span>
            </div>
          )}

          {/* Perforated dashed line */}
          <div className="relative z-10 my-5 border-t-2 border-dashed border-border" />

          {/* Itemized list */}
          <div className="relative z-10">
            <div className="mb-2 flex items-center justify-between text-small font-bold tracking-wide text-muted-foreground">
              <span className="w-8">#</span>
              <span className="flex-1 px-2">شرح خدمات</span>
              <span className="text-left">مبلغ</span>
            </div>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b border-dashed border-border/60 py-2.5 last:border-b-0"
              >
                <span className="w-8 text-xs font-semibold text-muted-foreground">
                  {toPersianDigits(idx + 1)}
                </span>
                <span className="flex-1 px-2 text-caption font-semibold text-foreground">
                  {item.name}
                </span>
                <span className="text-left text-xs font-bold tabular-nums text-foreground">
                  {formatPrice(item.price)} تومان
                </span>
              </div>
            ))}
          </div>

          {/* Total block */}
          <div className="relative z-10 mt-4 rounded-xl bg-muted/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                مدت کل
              </span>
              <span className="text-xs font-bold text-foreground">
                {toPersianDigits(totalDuration)} دقیقه
              </span>
            </div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                نحوه پرداخت
              </span>
              <span className="text-xs font-bold text-foreground">
                پرداخت در سالن
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
              <span className="text-sm font-bold text-foreground">جمع کل</span>
              <span className="text-xl font-extrabold tabular-nums text-foreground">
                {formatPrice(totalPrice)} تومان
              </span>
            </div>
          </div>

          {/* Date / time row */}
          <div className="relative z-10 mt-4 flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2.5">
            <span className="text-xs font-medium text-muted-foreground">تاریخ و ساعت</span>
            <span className="sr-only">{accessibleDateTime}</span>
            <span
              className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-1 gap-y-0.5 text-xs font-bold tabular-nums text-foreground"
              dir="rtl"
              aria-hidden="true"
            >
              {/* Persian reading order is right-to-left: the day is the first
                  token on the right, followed by month and year. Each numeric
                  run is isolated so browser bidi heuristics cannot reorder it. */}
              <span className="inline-flex shrink-0 items-center gap-1" dir="rtl">
                <bdi dir="ltr">{dateDay}</bdi>
                <span>{dateMonth}</span>
                <bdi dir="ltr">{dateYear}</bdi>
              </span>
              <span aria-hidden="true">·</span>
              <bdi className="shrink-0" dir="ltr">
                {toPersianDigits(startTime)} - {toPersianDigits(endTime)}
              </bdi>
            </span>
          </div>

          {/* QR + promo section */}
          {isFinal && bookingIdRaw && (
            <div className="relative z-10 mt-5 flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
              <div className="shrink-0">
                <BookingQrCode key={bookingIdRaw} bookingId={bookingIdRaw} label="رسید رزرو" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">
                  رسید خود را ذخیره کنید
                </p>
                <p className="mt-0.5 text-small leading-5 text-muted-foreground">
                  با اسکرین‌شات یا اشتراک تصویری این رسید را نزد خود داشته باشید.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="relative z-10 mt-5 space-y-1 border-t border-dashed border-border pt-4 text-center">
            {customerName && (
              <p className="text-xs text-muted-foreground">
                رزرو برای: <span className="font-semibold text-foreground">{customerName}</span>
              </p>
            )}
            {salonAddress && (
              <div className="flex items-start justify-center gap-1.5 text-small text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="leading-4">{salonAddress}</span>
              </div>
            )}
            {salonPhone && (
              <div className="flex items-center justify-center gap-1.5 text-small text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span dir="ltr">{salonPhone}</span>
              </div>
            )}
            <p className="pt-1 text-small text-muted-foreground/60">
              {salonName}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
