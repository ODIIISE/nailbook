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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  reserved: { label: "ثبت شده", cls: "reserved" },
  confirmed: { label: "تأیید شده", cls: "confirmed" },
  pending: { label: "در انتظار", cls: "pending" },
  completed: { label: "انجام شده", cls: "completed" },
  cancelled: { label: "لغو شده", cls: "cancelled" },
};

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

  // Cancel + toast only; the sheet owns its own close lifecycle (slide-out
  // before unmount) so the cancel confirm keeps its exit animation.
  // cancelBooking catches its own errors and returns false on failure —
  // only claim success when the server actually cancelled the booking.
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
      <div className="qbf-page">
        <header className="qbf-head">
          <button type="button" className="qbf-round-btn" onClick={goBack} aria-label="بازگشت">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="qbf-mid">
            <span className="qbf-kicker">نوبت‌های من</span>
            <h2 className="qbf-title">نوبت‌ها</h2>
          </div>
          <span className="qbf-head-spacer" />
        </header>
        <div className="qbp-body">
          <div className="qbf-empty">
            <div className="qbf-empty-icon">
              <User className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3>وارد شوید</h3>
            <p>برای دیدن نوبت‌های خود، با شماره موبایلی که رزرو کرده‌اید وارد شوید.</p>
            <button type="button" className="qbf-empty-cta" onClick={() => router.push("/login")}>
              ورود
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
    <div className="qbf-page">
      <header className="qbf-head">
        <button type="button" className="qbf-round-btn" onClick={goBack} aria-label="بازگشت">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="qbf-mid">
          <span className="qbf-kicker">نوبت‌های من</span>
          <h2 className="qbf-title">نوبت‌ها</h2>
        </div>
        <span className="qbf-head-spacer" />
      </header>

      <div className="qbp-body qbp-history-body">
        <section className="qbp-history-hero" aria-labelledby="booking-history-title">
          <div className="qbp-history-hero-icon"><Calendar aria-hidden="true" /></div>
          <div className="qbp-history-hero-copy">
            <span className="qbp-section-kicker">سوابق رزرو</span>
            <h3 id="booking-history-title">تاریخچه نوبت‌ها</h3>
            <p>{toPersianDigits(myBookings.length)} نوبت ثبت‌شده</p>
          </div>
          <span className="qbp-history-hero-mark" aria-hidden="true">{toPersianDigits(myBookings.length)}</span>
        </section>
        {myBookings.length === 0 ? (
            <div className="qbf-empty" style={{ marginTop: 12 }}>
              <div className="qbf-empty-icon">
                <Calendar className="h-7 w-7" aria-hidden="true" />
              </div>
              <h3>نوبتی ندارید</h3>
              <p>هنوز نوبتی رزرو نکرده‌اید. همین حالا اولین نوبت خود را بگیرید.</p>
              <button type="button" className="qbf-empty-cta" onClick={() => router.push("/")}>
                رزرو نوبت
              </button>
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.date}>
                <p className="qbp-date-label">{group.jalaliStr}</p>
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
                      className="qbp-book"
                      onClick={() => setSelectedBooking(booking)}
                      aria-label={`مشاهده نوبت ${getServiceName(booking.service_id)}`}
                    >
                      <div className="qbp-book-top">
                        <span className="qbf-rev-ic"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                        <span className="qbp-book-name">
                          <b>{getServiceName(booking.service_id)}</b>
                          <small>{booking.customer_name || "مشتری"}</small>
                        </span>
                        <span className={`qbp-status ${status.cls}`}><i aria-hidden="true" />{status.label}</span>
                      </div>
                      <div className="qbp-book-time">
                        <Clock aria-hidden="true" />
                        {formatJalaliTime(time)} تا {formatJalaliTime(endTime)}
                        <small>· {toPersianDigits(duration)} دقیقه</small>
                      </div>
                      {addonNames.length > 0 && (
                        <div className="qbp-chips">
                          {addonNames.map((name) => <span key={name} className="qbp-chip">{name}</span>)}
                        </div>
                      )}
                      <div className="qbp-book-foot">
                        <b>{price !== null ? compactToman(Number(price)) : "قیمت در سالن"}</b>
                        <small dir="ltr">#{booking.id.slice(-4).toUpperCase()}</small>
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
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, visible);
  const cancelingRef = useRef(false);
  const closingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const jalali = gregorianToJalali(parseGregorianDateKey(booking.date_gregorian));
  const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
  const time = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);
  const addonNames = getAddonNames(booking.selected_addons || []);
  const price = getServicePrice(booking.service_id);
  const canCancel = booking.status === "reserved" || booking.status === "confirmed";

  // Exit lifecycle: hide first, then unmount after the 450ms slide-out so the
  // closing animation actually plays instead of vanishing instantly.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setConfirming(false);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      onCloseRef.current();
    }, 450);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 80);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(focusTimer);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
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
      // Cancel succeeded — let the sheet slide out before unmounting.
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
    <div className="qbp-sheet-wrap" role="dialog" aria-modal="true" aria-label="جزئیات نوبت">
      <div
        className="qbp-sheet-scrim"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={() => { if (!cancelingRef.current) requestClose(); }}
        aria-hidden="true"
      />
      <div ref={sheetRef} className="qbp-sheet" style={{ transform: visible ? "none" : "translateY(105%)" }}>
        <div className="qbp-sheet-handle" aria-hidden="true" />
        <div className="qbp-sheet-head">
          <h3>جزئیات نوبت</h3>
          <button ref={closeRef} type="button" className="qbp-sheet-close" onClick={requestClose} aria-label="بستن">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="qbp-sheet-content">
          <div className="qbp-detail-card">
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">خدمت</span>
              <span className="qbp-dvalue">{getServiceName(booking.service_id)}</span>
            </div>
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">مشتری</span>
              <span className="qbp-dvalue">{booking.customer_name || "—"}</span>
            </div>
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">تاریخ</span>
              <span className="qbp-dvalue">
                {toPersianDigits(jalali.jd)} {JALALI_MONTHS[jalali.jm]} {toPersianDigits(jalali.jy)}
              </span>
            </div>
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">ساعت</span>
              <span className="qbp-dvalue">{formatJalaliTime(time)} تا {formatJalaliTime(endTime)}</span>
            </div>
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">مدت</span>
              <span className="qbp-dvalue">{toPersianDigits(Math.max(0, (() => {
                const s = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
                const e = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
                return e >= s ? e - s : e + 24 * 60 - s;
              })()))} دقیقه</span>
            </div>
            {addonNames.length > 0 && (
              <div className="qbp-detail-row">
                <span className="qbp-dlabel">افزودنی‌ها</span>
                <span className="qbp-dvalue small">{addonNames.join("، ")}</span>
              </div>
            )}
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">هزینه</span>
              <span className="qbp-dvalue">{price !== null ? compactToman(Number(price)) : "در سالن"}</span>
            </div>
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">وضعیت</span>
              <span className={`qbp-status ${status.cls}`}><i aria-hidden="true" />{status.label}</span>
            </div>
            <div className="qbp-detail-row">
              <span className="qbp-dlabel">کد رهگیری</span>
              <span className="qbp-dvalue small" dir="ltr">#{booking.id.slice(-4).toUpperCase()}</span>
            </div>
          </div>

          <div className="qbp-sheet-actions">
            {canCancel && !confirming && (
              <button type="button" className="qbp-btn-danger" onClick={() => setConfirming(true)}>
                لغو نوبت
              </button>
            )}
            {canCancel && confirming && (
              <div className="qbp-confirm-row">
                <button type="button" className="qbp-btn-solid" onClick={handleCancelClick}>
                  بله، لغو کن
                </button>
                <button type="button" className="qbp-btn-danger" onClick={() => setConfirming(false)}>
                  انصراف
                </button>
              </div>
            )}
            <button type="button" className="qbp-btn-solid" onClick={requestClose}>
              بستن
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
