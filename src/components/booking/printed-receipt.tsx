"use client";

import { useMemo, useState, useEffect } from "react";
import QRCode from "qrcode";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, MapPin, Phone } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { TornPaperCard } from "./torn-paper-card";

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

/* ── Animation variants ── */

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, rotate: -1.5, y: 24 },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 24,
      mass: 0.8,
    },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.12,
    },
  },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 28,
    },
  },
};

/* ── Confetti burst ── */

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Confetti({ seed }: { seed: string }) {
  const seedValue = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const particles = useMemo(() => {
    const rand = seededRandom(seedValue);
    const count = 24;
    const colors = ["#16A34A", "#2563EB", "#F59E0B", "#DC2626", "#0A0A0A"];
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * 360 + rand() * 20;
      const distance = 60 + rand() * 80;
      const color = colors[i % colors.length];
      const size = 4 + rand() * 5;
      const delay = rand() * 0.1;
      const duration = 0.8 + rand() * 0.5;
      const rotation = rand() * 360;
      return { angle, distance, color, size, delay, duration, rotation };
    });
  }, [seedValue]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 overflow-visible"
      aria-hidden="true"
    >
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 block rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: p.rotation }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance + 40,
            opacity: [0, 1, 0],
            scale: [0, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: 0.2 + p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
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
      <div className="relative rounded-lg border border-border bg-card p-2 shadow-sm">
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
          <div className="flex h-[120px] w-[120px] items-center justify-center rounded bg-muted text-center text-[10px] leading-5 text-muted-foreground">
            خطا در ساخت QR
          </div>
        ) : (
          <div className="h-[120px] w-[120px] animate-pulse rounded bg-muted" />
        )}
      </div>
      {label && (
        <span className="text-[10px] font-medium text-muted-foreground tracking-wide">
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
  const shouldReduceMotion = useReducedMotion();
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

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : undefined;

  return (
    <motion.article
      className={`relative mx-auto max-w-md ${className}`}
      aria-label={isFinal ? "رسید نهایی رزرو" : "پیش‌فاکتور رزرو"}
      initial={shouldReduceMotion ? "visible" : "hidden"}
      animate="visible"
      variants={containerVariants}
      transition={transition}
    >
      {isFinal && !shouldReduceMotion && bookingId && <Confetti seed={bookingId} />}
      <TornPaperCard className="shadow-card">
        <motion.div
          className="relative overflow-hidden rounded bg-transparent px-5 py-5"
          variants={contentVariants}
          initial={shouldReduceMotion ? "visible" : "hidden"}
          animate="visible"
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
          <motion.div className="relative z-10 flex items-start justify-between gap-3" variants={sectionVariants}>
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
                <div className="text-[10px] font-medium text-muted-foreground">
                  رسید رزرو
                </div>
              </div>
            </div>
            {displayId ? (
              <div className="text-left" dir="ltr">
                <div className="text-[10px] font-medium tabular-nums tracking-wide text-muted-foreground">
                  #{displayId}
                </div>
                <div className="mt-0.5 text-[9px] tabular-nums text-muted-foreground/70">
                  {issueDate}
                </div>
              </div>
            ) : (
              <div className="text-left">
                <div className="text-[10px] font-medium text-muted-foreground/70">
                  پیش‌فاکتور
                </div>
                <div className="mt-0.5 text-[9px] tabular-nums text-muted-foreground/70">
                  {issueDate}
                </div>
              </div>
            )}
          </motion.div>

          {/* Status badge */}
          <motion.div className="relative z-10 mt-4 text-center" variants={sectionVariants}>
            <div
              className={`relative inline-flex items-center gap-1.5 isolate rounded-full px-3 py-1 text-xs font-semibold ${
                isFinal
                  ? "bg-success/10 text-success"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isFinal && !shouldReduceMotion && (
                <motion.div
                  className="absolute left-1/2 top-1/2 -z-10 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-success/30"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [1, 1.7, 1.7], opacity: [0.6, 0, 0] }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              )}
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
                : "لطفاً جزئیات زیر را بررسی و تایید کنید."}
            </p>
          </motion.div>

          {/* Reference */}
          {isFinal && bookingId && (
            <motion.div className="relative z-10 mt-4 text-center" variants={sectionVariants}>
              <span className="text-xs text-muted-foreground">شماره رزرو:</span>
              <span
                className="mr-1 inline-block select-all text-sm font-bold tabular-nums tracking-widest text-primary"
                dir="ltr"
              >
                {bookingId}
              </span>
            </motion.div>
          )}

          {/* Perforated dashed line */}
          <div className="relative z-10 my-5 border-t-2 border-dashed border-border" />

          {/* Itemized list */}
          <motion.div className="relative z-10" variants={sectionVariants}>
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-wide text-muted-foreground">
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
                <span className="flex-1 px-2 text-[13px] font-semibold text-foreground">
                  {item.name}
                </span>
                <span className="text-left text-xs font-bold tabular-nums text-foreground">
                  {formatPrice(item.price)} تومان
                </span>
              </div>
            ))}
          </motion.div>

          {/* Total block */}
          <motion.div className="relative z-10 mt-4 rounded-xl bg-muted/40 p-3" variants={sectionVariants}>
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
          </motion.div>

          {/* Date / time row */}
          <motion.div className="relative z-10 mt-4 flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2.5" variants={sectionVariants}>
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
          </motion.div>

          {/* QR + promo section */}
          {isFinal && bookingIdRaw && (
            <motion.div className="relative z-10 mt-5 flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3" variants={sectionVariants}>
              <div className="shrink-0">
                <BookingQrCode key={bookingIdRaw} bookingId={bookingIdRaw} label="رسید رزرو" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">
                  رسید خود را ذخیره کنید
                </p>
                <p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">
                  با اسکرین‌شات یا اشتراک تصویری این رسید را نزد خود داشته باشید.
                </p>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <motion.div className="relative z-10 mt-5 space-y-1 border-t border-dashed border-border pt-4 text-center" variants={sectionVariants}>
            {customerName && (
              <p className="text-xs text-muted-foreground">
                رزرو برای: <span className="font-semibold text-foreground">{customerName}</span>
              </p>
            )}
            {salonAddress && (
              <div className="flex items-start justify-center gap-1.5 text-[10px] text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span className="leading-4">{salonAddress}</span>
              </div>
            )}
            {salonPhone && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span dir="ltr">{salonPhone}</span>
              </div>
            )}
            <p className="pt-1 text-[9px] text-muted-foreground/60">
              {salonName}
            </p>
          </motion.div>
        </motion.div>
      </TornPaperCard>
    </motion.article>
  );
}
