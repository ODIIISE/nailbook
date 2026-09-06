"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Clock, Calendar, User, ArrowRight, Sparkles, X } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { useBookingsPolling } from "@/lib/hooks/use-bookings-polling";
import { gregorianToJalali, toPersianDigits, formatJalaliTime } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";
import { compactToman } from "@/lib/pricing";
import type { Booking } from "@/lib/types";

// Shared status pill: bg/text per state + leading dot color.
const STATUS_PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-micro font-bold";

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  reserved: { label: "ثبت شده", cls: "bg-primary/10 text-primary", dot: "bg-primary" },
  confirmed: { label: "تأیید شده", cls: "bg-success/10 text-success", dot: "bg-success" },
  pending: { label: "در انتظار", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  completed: { label: "انجام شده", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  cancelled: { label: "لغو شده", cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

function StatusPill({ status }: { status: { cls: string; dot: string; label: string } }) {
  return (
    <span className={`${STATUS_PILL_BASE} ${status.cls}`}>
      <i aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
      {status.label}
    </span>
  );
}

const JALALI_MONTHS = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, services, addons, cancelBooking } = useSalon();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Shared polling policy (10s + focus/visibility refresh).
  useBookingsPolling("default");

  // A customer's history is matched by their user row; the phone fallback
  // also surfaces owner-created bookings whose customer hasn't OTP-verified
  // into a session yet (their user row exists — see /api/owner/bookings).
  const myBookings = useMemo(() => {
    if (!user) return [];
    return bookings
      .filter((b) => b.user_id === user.id || b.customer_phone === user.phone)
      .sort((a, b) => {
        const dateA = parseGregorianDateKey(a.date_gregorian).getTime();
        const dateB = parseGregorianDateKey(b.date_gregorian).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return b.start_time.localeCompare(a.start_time);
      });
  }, [bookings, user]);

  const getServiceName = (serviceId: string) => services.find((s) => s.id === serviceId)?.name || "نامعلوم";
  const getAddonNames = (addonIds: string[]) => addonIds.map((id) => addons.find((a) => a.id === id)?.name || "").filter(Boolean);
  const getServicePrice = (serviceId: string) => services.find((s) => s.id === serviceId)?.price ?? null;

  const groupedByDate = useMemo(() => {
    const groups: { date: string; jalaliStr: string; bookings: Booking[] }[] = [];
    const map = new Map<string, Booking[]>();
    for (const b of myBookings) {
      const key = b.date_gregorian;
      if (!map.has(key)) {
        const jalali = gregorianToJalali(parseGregorianDateKey(key));
        const jalaliStr = `${toPersianDigits(jalali.jd)} ${JALALI_MONTHS[jalali.jm]} ${toPersianDigits(jalali.jy)}`;
        groups.push({ date: key, jalaliStr, bookings: [] });
        map.set(key, groups[groups.length - 1].bookings);
      }
      map.get(key)!.push(b);
    }
    return groups;
  }, [myBookings]);

  const goBack = () => {
    window.dispatchEvent(new Event("nailbook:back"));
    router.push("/");
  };

  // Cancel + toast only; the sheet calls onClose() directly (rebuild: sheets
  // are instant — no slide-out lifecycle). cancelBooking catches its own
  // errors and returns false on failure — only claim success when the server
  // actually cancelled the booking.
  const handleCancel = useCallback(async (id: string) => {
    const result = await cancelBooking(id);
    if (result.success) {
      toast.success("نوبت لغو شد");
    } else {
      toast.error(result.error || "خطا در لغو نوبت — لطفاً دوباره تلاش کنید");
    }
  }, [cancelBooking]);

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3.5 pb-2 pt-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
            onClick={goBack}
            aria-label="بازگشت"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 overflow-hidden text-center">
            <span className="block text-xs font-extrabold text-primary">نوبت‌های من</span>
            <h2 className="truncate text-lg font-bold">نوبت‌ها</h2>
          </div>
          <span className="h-11 w-11" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
          <div className="rounded-lg border border-border bg-card p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <User className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-extrabold">وارد شوید</h3>
            <p className="mx-auto mb-4 mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">برای دیدن نوبت‌های خود، با شماره موبایلی که رزرو کرده‌اید وارد شوید.</p>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground"
              onClick={() => router.push("/login")}
            >
              ورود
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
    <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
      <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3.5 pb-2 pt-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          onClick={goBack}
          aria-label="بازگشت"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 overflow-hidden text-center">
          <span className="block text-xs font-extrabold text-primary">نوبت‌های من</span>
          <h2 className="truncate text-lg font-bold">نوبت‌ها</h2>
        </div>
        <span className="h-11 w-11" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
        <section
          className="relative mb-3 flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-4"
          aria-labelledby="booking-history-title"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-micro font-extrabold tracking-[0.24em] text-muted-foreground uppercase" dir="ltr">HISTORY</span>
            <h3 id="booking-history-title" className="mt-0.5 text-base font-extrabold">تاریخچه نوبت‌ها</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{toPersianDigits(myBookings.length)} نوبت ثبت‌شده</p>
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 -end-2 select-none text-[96px] font-extrabold leading-none text-muted-foreground/10">
            {toPersianDigits(myBookings.length)}
          </span>
        </section>
        {myBookings.length === 0 ? (
            <div className="mt-3 rounded-lg border border-border bg-card p-6 text-center shadow-card">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <Calendar className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-extrabold">نوبتی ندارید</h3>
              <p className="mx-auto mb-4 mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">هنوز نوبتی رزرو نکرده‌اید. همین حالا اولین نوبت خود را بگیرید.</p>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground"
                onClick={() => router.push("/")}
              >
                رزرو نوبت
              </button>
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.date}>
                <p className="pb-1 pt-4 text-xs font-bold text-muted-foreground">{group.jalaliStr}</p>
                {group.bookings.map((booking) => {
                  const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
                  const time = booking.start_time.slice(0, 5);
                  const endTime = booking.end_time.slice(0, 5);
                  const startM = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
                  const endM = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
                  const duration = endM >= startM ? endM - startM : endM + 24 * 60 - startM;
                  const addonNames = getAddonNames(booking.selected_addons || []);
                  const price = getServicePrice(booking.service_id);

                  return (
                    <button
                      key={booking.id}
                      type="button"
                      className="mb-2.5 w-full rounded-lg border border-border bg-card p-4 text-start shadow-card"
                      onClick={() => setSelectedBooking(booking)}
                      aria-label={`مشاهده نوبت ${getServiceName(booking.service_id)}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-sm font-bold">{getServiceName(booking.service_id)}</b>
                          <small className="mt-0.5 block text-micro text-muted-foreground">{booking.customer_name || "مشتری"}</small>
                        </span>
                        <StatusPill status={status} />
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{formatJalaliTime(time)} تا {formatJalaliTime(endTime)}</span>
                        <span>· {toPersianDigits(duration)} دقیقه</span>
                      </div>
                      {addonNames.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {addonNames.map((name) => <span key={name} className="rounded-full bg-muted px-2.5 py-1 text-micro font-bold text-secondary-foreground">{name}</span>)}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <b className="text-sm font-extrabold">{price !== null ? compactToman(Number(price)) : "قیمت در سالن"}</b>
                        <small dir="ltr" className="text-micro font-bold text-muted-foreground">#{booking.id.slice(-4).toUpperCase()}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
      </div>

      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={handleCancel}
          getServiceName={getServiceName}
          getAddonNames={getAddonNames}
          getServicePrice={getServicePrice}
        />
      )}
    </div>
    </SalonGuard>
  );
}

function BookingDetailSheet({
  booking,
  onClose,
  onCancel,
  getServiceName,
  getAddonNames,
  getServicePrice,
}: {
  booking: Booking;
  onClose: () => void;
  onCancel: (id: string) => void;
  getServiceName: (id: string) => string;
  getAddonNames: (ids: string[]) => string[];
  getServicePrice: (id: string) => number | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, true);
  const cancelingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const jalali = gregorianToJalali(parseGregorianDateKey(booking.date_gregorian));
  const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
  const time = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);
  const addonNames = getAddonNames(booking.selected_addons || []);
  const price = getServicePrice(booking.service_id);
  const canCancel = booking.status === "reserved" || booking.status === "confirmed";

  // Rebuild: sheets render instantly — close just unmounts, no exit phase.
  const requestClose = useCallback(() => {
    setConfirming(false);
    onCloseRef.current();
  }, []);

  useEffect(() => {
    const focusTimer = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 80);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prevOverflow;
      document.body.style.overflow = "";
    };
  }, [requestClose]);

  const handleCancelClick = async () => {
    if (cancelingRef.current) return;
    cancelingRef.current = true;
    setConfirming(false);
    try {
      await Promise.resolve(onCancel(booking.id));
      // Cancel succeeded — close the sheet.
      requestClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در لغو نوبت");
    } finally {
      cancelingRef.current = false;
    }
  };

  // Portal to <body> so a transformed ancestor (page wrapper) can
  // never re-anchor the fixed sheet away from the viewport — same hardening as
  // the homepage sheets.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="جزئیات نوبت">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => { if (!cancelingRef.current) requestClose(); }}
        aria-hidden="true"
      />
      <div
        ref={sheetRef}
        className="relative z-10 flex max-h-[88dvh] w-full max-w-[var(--frame-max-w)] flex-col rounded-t-xl border-t bg-popover p-4 pb-[calc(16px+env(safe-area-inset-bottom))] text-popover-foreground shadow-floating"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold">جزئیات نوبت</h3>
          <button
            ref={closeRef}
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            onClick={requestClose}
            aria-label="بستن"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mb-3.5 overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs text-muted-foreground">خدمت</span>
              <span className="text-sm font-extrabold">{getServiceName(booking.service_id)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">مشتری</span>
              <span className="text-sm font-extrabold">{booking.customer_name || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">تاریخ</span>
              <span className="text-sm font-extrabold">
                {toPersianDigits(jalali.jd)} {JALALI_MONTHS[jalali.jm]} {toPersianDigits(jalali.jy)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">ساعت</span>
              <span className="text-sm font-extrabold">{formatJalaliTime(time)} تا {formatJalaliTime(endTime)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">مدت</span>
              <span className="text-sm font-extrabold">{toPersianDigits(Math.max(0, (() => {
                const s = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
                const e = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
                return e >= s ? e - s : e + 24 * 60 - s;
              })()))} دقیقه</span>
            </div>
            {addonNames.length > 0 && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <span className="shrink-0 text-xs text-muted-foreground">افزودنی‌ها</span>
                <span className="text-start text-xs font-bold">{addonNames.join("، ")}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">هزینه</span>
              <span className="text-sm font-extrabold">{price !== null ? compactToman(Number(price)) : "در سالن"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">وضعیت</span>
              <StatusPill status={status} />
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">کد رهگیری</span>
              <span className="text-xs font-bold" dir="ltr">#{booking.id.slice(-4).toUpperCase()}</span>
            </div>
          </div>

          <div className="mt-1 flex flex-col gap-2.5">
            {canCancel && !confirming && (
              <button
                type="button"
                className="flex h-12 w-full items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10 text-sm font-extrabold text-destructive"
                onClick={() => setConfirming(true)}
              >
                لغو نوبت
              </button>
            )}
            {canCancel && confirming && (
              <div className="flex gap-2.5">
                <button
                  type="button"
                  className="h-12 flex-1 rounded-lg bg-destructive text-sm font-extrabold text-white"
                  onClick={handleCancelClick}
                >
                  بله، لغو کن
                </button>
                <button
                  type="button"
                  className="h-12 flex-1 rounded-lg border border-destructive/30 bg-destructive/10 text-sm font-extrabold text-destructive"
                  onClick={() => setConfirming(false)}
                >
                  انصراف
                </button>
              </div>
            )}
            <button
              type="button"
              className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-extrabold text-primary-foreground"
              onClick={requestClose}
            >
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
