"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { SalonGuard } from "@/components/ui/salon-guard";
import { StatusPill } from "@/components/ui/status-pill";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Clock, Calendar, User, ArrowRight, Sparkles } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { persianizeError } from "@/lib/error-sanitize";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useBookingsPolling } from "@/lib/hooks/use-bookings-polling";
import { gregorianToJalali, toPersianDigits, formatJalaliTime } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";
import { compactToman } from "@/lib/pricing";
import type { Booking } from "@/lib/types";

// Shared status pill — see src/components/ui/status-pill.tsx.

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
  const handleCancel = useCallback(async (id: string): Promise<boolean> => {
    const result = await cancelBooking(id);
    if (result.success) {
      return true;
    }
    toast.error(result.error || "خطا در لغو نوبت — لطفاً دوباره تلاش کنید");
    return false;
  }, [cancelBooking]);

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3 pb-2 pt-3">
          <button
            type="button"
            className="icon-btn text-foreground"
            onClick={goBack}
            aria-label="بازگشت"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 overflow-hidden text-center">
            <span className="block text-xs font-normal text-primary">نوبت‌های من</span>
            <h2 className="truncate text-lg font-normal">نوبت‌ها</h2>
          </div>
          <span className="h-11 w-11" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
          <div className="rounded-none border border-border bg-card p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-none bg-muted text-muted-foreground">
              <User className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-normal">وارد شوید</h3>
            <p className="mx-auto mb-4 mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">برای دیدن نوبت‌های خود، با شماره موبایلی که رزرو کرده‌اید وارد شوید.</p>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-normal text-primary-foreground"
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
      <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3 pb-2 pt-3">
        <button
          type="button"
          className="icon-btn text-foreground"
          onClick={goBack}
          aria-label="بازگشت"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 overflow-hidden text-center">
          <span className="block text-xs font-normal text-primary">نوبت‌های من</span>
          <h2 className="truncate text-lg font-normal">نوبت‌ها</h2>
        </div>
        <span className="h-11 w-11" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
        <section
          className="relative mb-3 flex items-center gap-2 overflow-hidden rounded-none border border-border bg-card p-3"
          aria-labelledby="booking-history-title"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-muted text-foreground">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-kicker text-muted-foreground">تاریخچه</span>
            <h3 id="booking-history-title" className="mt-0.5 text-base font-normal">تاریخچه نوبت‌ها</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{toPersianDigits(myBookings.length)} نوبت ثبت‌شده</p>
          </span>
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 -end-2 select-none text-[96px] font-normal leading-none text-muted-foreground/10">
            {toPersianDigits(myBookings.length)}
          </span>
        </section>
        {myBookings.length === 0 ? (
            <div className="mt-3 rounded-none border border-border bg-card p-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-none bg-muted text-muted-foreground">
                <Calendar className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-normal">نوبتی ندارید</h3>
              <p className="mx-auto mb-4 mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">هنوز نوبتی رزرو نکرده‌اید. همین حالا اولین نوبت خود را بگیرید.</p>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-normal text-primary-foreground"
                onClick={() => router.push("/")}
              >
                رزرو نوبت
              </button>
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.date}>
                <p className="pb-1 pt-4 text-xs font-normal text-muted-foreground">{group.jalaliStr}</p>
                {group.bookings.map((booking) => {
                  const time = booking.start_time.slice(0, 5);
                  const endTime = booking.end_time.slice(0, 5);
                  const startM = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
                  const endM = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
                  const duration = endM >= startM ? endM - startM : endM + 24 * 60 - startM;
                  const addonNames = getAddonNames(booking.selected_addons || []);
                  // Price snapshot (migration 022) first — a repriced or deleted
                  // service must not rewrite what the customer actually booked.
                  const price = booking.price_total ?? getServicePrice(booking.service_id);

                  return (
                    <button
                      key={booking.id}
                      type="button"
                      className="mb-2.5 w-full rounded-none border border-border bg-card p-3 text-start"
                      onClick={() => setSelectedBooking(booking)}
                      aria-label={`مشاهده نوبت ${getServiceName(booking.service_id)}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-muted text-foreground"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-sm font-normal">{getServiceName(booking.service_id)}</b>
                          <small className="mt-0.5 block text-micro text-muted-foreground">{booking.customer_name || "مشتری"}</small>
                        </span>
                        <StatusPill status={booking.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{formatJalaliTime(time)} تا {formatJalaliTime(endTime)}</span>
                        <span>· {toPersianDigits(duration)} دقیقه</span>
                      </div>
                      {addonNames.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {addonNames.map((name) => <span key={name} className="rounded-full bg-muted px-2.5 py-1 text-micro font-normal text-secondary-foreground">{name}</span>)}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <b className="text-sm font-normal">{price !== null ? compactToman(Number(price)) : "قیمت در سالن"}</b>
                        <small dir="ltr" className="text-micro font-normal text-muted-foreground">#{booking.id.slice(-6).toUpperCase()}</small>
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
  onCancel: (id: string) => Promise<boolean>;
  getServiceName: (id: string) => string;
  getAddonNames: (ids: string[]) => string[];
  getServicePrice: (id: string) => number | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const cancelingRef = useRef(false);

  const jalali = gregorianToJalali(parseGregorianDateKey(booking.date_gregorian));
  const time = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);
  const addonNames = getAddonNames(booking.selected_addons || []);
  const price = booking.price_total ?? getServicePrice(booking.service_id);
  const canCancel = booking.status === "reserved" || booking.status === "confirmed";

  // Close only when the server actually cancelled — a failed attempt must
  // keep the sheet open (with the rolled-back status) so the user can retry.
  // Escape / scrim / X are owned by BottomSheet; confirming resets on close.
  const requestClose = useCallback(() => {
    setConfirming(false);
    onClose();
  }, [onClose]);

  const handleCancelClick = async () => {
    if (cancelingRef.current) return;
    cancelingRef.current = true;
    setConfirming(false);
    try {
      // Close only when the server actually cancelled — a failed attempt must
      // keep the sheet open (with the rolled-back status) so the user can retry.
      const ok = await onCancel(booking.id);
      if (ok) requestClose();
    } catch (error) {
      toast.error(persianizeError(error, "خطا در لغو نوبت"));
    } finally {
      cancelingRef.current = false;
    }
  };

  return (
    <BottomSheet open={true} onClose={requestClose} title="جزئیات نوبت">
      <div className="mb-3 overflow-hidden rounded-none border border-border bg-card text-card-foreground">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <span className="text-xs text-card-foreground/60">خدمت</span>
          <span className="text-sm font-normal">{getServiceName(booking.service_id)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-card-foreground/60">مشتری</span>
          <span className="text-sm font-normal">{booking.customer_name || "—"}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-card-foreground/60">تاریخ</span>
          <span className="text-sm font-normal">
            {toPersianDigits(jalali.jd)} {JALALI_MONTHS[jalali.jm]} {toPersianDigits(jalali.jy)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-card-foreground/60">ساعت</span>
          <span className="text-sm font-normal">{formatJalaliTime(time)} تا {formatJalaliTime(endTime)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-card-foreground/60">مدت</span>
          <span className="text-sm font-normal">{toPersianDigits(Math.max(0, (() => {
            const s = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
            const e = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
            return e >= s ? e - s : e + 24 * 60 - s;
          })()))} دقیقه</span>
        </div>
        {addonNames.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <span className="shrink-0 text-xs text-card-foreground/60">افزودنی‌ها</span>
            <span className="text-start text-xs font-normal">{addonNames.join("، ")}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-card-foreground/60">هزینه</span>
          <span className="text-sm font-normal">{price !== null ? compactToman(Number(price)) : "در سالن"}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-card-foreground/60">وضعیت</span>
          <StatusPill status={booking.status} onDark />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <span className="text-xs text-card-foreground/60">کد رهگیری</span>
          <span className="text-xs font-normal" dir="ltr">#{booking.id.slice(-6).toUpperCase()}</span>
        </div>
      </div>

      <div className="mt-1 flex flex-col gap-2.5">
        {canCancel && !confirming && (
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-none border border-destructive/30 bg-destructive/10 text-sm font-normal text-destructive"
            onClick={() => setConfirming(true)}
          >
            لغو نوبت
          </button>
        )}
        {canCancel && confirming && (
          <div className="flex gap-2.5">
            <button
              type="button"
              className="h-12 flex-1 rounded-none bg-destructive text-sm font-normal text-destructive-foreground"
              onClick={handleCancelClick}
            >
              بله، لغو کن
            </button>
            <button
              type="button"
              className="h-12 flex-1 rounded-none border border-destructive/30 bg-destructive/10 text-sm font-normal text-destructive"
              onClick={() => setConfirming(false)}
            >
              انصراف
            </button>
          </div>
        )}
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-none bg-primary text-sm font-normal text-primary-foreground"
          onClick={requestClose}
        >
          بستن
        </button>
      </div>
    </BottomSheet>
  );
}
