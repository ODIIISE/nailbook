"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Badge } from "@/components/ui/badge";
import { Confirm } from "@/components/ui/confirm";
import { Seg } from "@/components/ui/seg";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useBookingsPolling } from "@/lib/hooks/use-bookings-polling";
import { gregorianToJalali, toPersianDigits, formatPrice } from "@/lib/jalali";
import { parseGregorianDateKey, getTehranNow } from "@/lib/time";
import { STATUS_CONFIG } from "@/lib/design-tokens";
import type { Booking } from "@/lib/types";

const LIVE_STATUSES = new Set(["reserved", "confirmed", "in_progress", "pending"]);

const STATUS_TONE: Record<string, "pearl" | "gold" | "sage" | "wine" | "mute"> = {
  reserved: "pearl",
  pending: "pearl",
  confirmed: "gold",
  in_progress: "gold",
  completed: "sage",
  cancelled: "mute",
  noshow: "wine",
};

function statusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label || status;
}

/** Hours from now until the booking starts (Tehran wall clock → absolute). */
function hoursUntil(b: Booking): number {
  const [y, mo, d] = b.date_gregorian.split("T")[0].split("-").map(Number);
  const [h, mi] = b.start_time.slice(0, 5).split(":").map(Number);
  const startMs = Date.UTC(y, mo - 1, d, h, mi) - 3.5 * 3600 * 1000;
  return (startMs - Date.now()) / 3600000;
}

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, services, addons, salon, cancelBooking } = useSalon();
  const [tab, setTab] = useState<"up" | "past">("up");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useBookingsPolling("default");

  const myBookings = useMemo(() => {
    if (!user) return [];
    return bookings.filter((b) => b.user_id === user.id || b.customer_phone === user.phone);
  }, [bookings, user]);

  const now = getTehranNow();
  const isUpcoming = (b: Booking) => {
    if (!LIVE_STATUSES.has(b.status)) return false;
    const day = b.date_gregorian.split("T")[0];
    if (day !== now.dateKey) return day > now.dateKey;
    const [h, m] = b.end_time.split(":").map(Number);
    return (h || 0) * 60 + (m || 0) > now.minutes;
  };
  const upBookings = useMemo(
    () =>
      myBookings
        .filter(isUpcoming)
        .sort((a, b) => (a.date_gregorian + a.start_time).localeCompare(b.date_gregorian + b.start_time)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myBookings, now.dateKey, now.minutes]
  );
  const pastBookings = useMemo(
    () =>
      myBookings
        .filter((b) => !isUpcoming(b))
        .sort((a, b) => (b.date_gregorian + b.start_time).localeCompare(a.date_gregorian + a.start_time)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myBookings, now.dateKey, now.minutes]
  );
  const visible = tab === "up" ? upBookings : pastBookings;

  const serviceOf = (b: Booking) => services.find((s) => s.id === b.service_id);
  const priceOf = (b: Booking) =>
    b.price_total ?? serviceOf(b)?.price ?? 0;

  const rebook = (b: Booking) => {
    const params = new URLSearchParams();
    if (b.service_id) params.set("service", b.service_id);
    if (b.selected_addons?.length) params.set("addons", b.selected_addons.join(","));
    if (b.artist_id) params.set("artist", b.artist_id);
    router.push(`/book?${params.toString()}`);
  };

  const doCancel = async () => {
    if (!confirmId) return;
    const result = await cancelBooking(confirmId);
    setConfirmId(null);
    if (!result.success) toast.error(result.error || "خطا در لغو نوبت");
  };

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="hd">
          <button type="button" className="iconbtn" onClick={() => router.push("/")} aria-label="بازگشت">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="h-m truncate text-center">نوبت‌های من</h2>
          <span className="h-11 w-11" />
        </header>
        <div className="empty">
          برای دیدن نوبت‌ها وارد شوید.
          <br />
          <button type="button" className="btn pri sm" style={{ marginTop: 16 }} onClick={() => router.push("/login")}>
            ورود
          </button>
        </div>
      </div>
    );
  }

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="hd">
          <button type="button" className="iconbtn" onClick={() => router.push("/")} aria-label="بازگشت">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="h-m truncate text-center">نوبت‌های من</h2>
          <span className="h-11 w-11" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
          <Seg
            value={tab}
            onChange={setTab}
            label="نوبت‌ها"
            options={[
              { value: "up", label: `پیش‌رو (${toPersianDigits(upBookings.length)})` },
              { value: "past", label: `گذشته (${toPersianDigits(pastBookings.length)})` },
            ]}
          />

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            <AnimatePresence initial={false}>
              {visible.length === 0 && (
                <motion.div key="empty" className="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {tab === "up" ? (
                    <>
                      هنوز نوبتی ندارید.
                      <br />
                      <button type="button" className="btn pri sm" style={{ marginTop: 16 }} onClick={() => router.push("/book")}>
                        رزرو وقت
                      </button>
                    </>
                  ) : (
                    "سابقه‌ای ثبت نشده."
                  )}
                </motion.div>
              )}
              {visible.map((b, i) => {
                const j = gregorianToJalali(parseGregorianDateKey(b.date_gregorian.split("T")[0]));
                const live = isUpcoming(b);
                const cancellable =
                  live &&
                  (b.status === "reserved" || b.status === "confirmed") &&
                  hoursUntil(b) >= (salon.cancel_hours ?? 24);
                const addonNames = (b.selected_addons || [])
                  .map((id) => addons.find((a) => a.id === id)?.name || "")
                  .filter(Boolean);
                return (
                  <motion.div
                    key={b.id}
                    layout
                    className="panel"
                    style={{ padding: 18 }}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: Math.min(i, 8) * 0.04 }}
                  >
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div style={{ width: 62, textAlign: "center", flex: "none", paddingTop: 2 }}>
                        <div className="num" style={{ fontSize: 30, fontWeight: 100, lineHeight: 1 }}>
                          {toPersianDigits(j.jd)}
                        </div>
                        <div className="t-s">{["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"][j.jm]}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0, borderInlineStart: "1px solid var(--line)", paddingInlineStart: 16 }}>
                        <div className="row" style={{ justifyContent: "space-between", gap: 8 }}>
                          <div style={{ fontSize: 17 }}>{serviceOf(b)?.name || "نامعلوم"}</div>
                          <Badge variant={STATUS_TONE[b.status] || "mute"}>{statusLabel(b.status)}</Badge>
                        </div>
                        <div className="t-s num">
                          {toPersianDigits(b.start_time.slice(0, 5))} تا {toPersianDigits(b.end_time.slice(0, 5))}
                          {(b.artist_name || b.artist_id) && <>، با {b.artist_name || "هنرمند"}</>}
                        </div>
                        {addonNames.length > 0 && <div className="t-s faint">{addonNames.join("، ")}</div>}
                        <div className="num" style={{ fontSize: 14, color: "var(--pearl)", marginTop: 2 }}>
                          {formatPrice(priceOf(b))} تومان
                          <span className="faint">
                            ، کد <span className="ltr">{b.id.slice(-6).toUpperCase()}</span>
                          </span>
                        </div>
                        <div className="row" style={{ marginTop: 12, gap: 8 }}>
                          {live ? (
                            cancellable ? (
                              <button type="button" className="btn danger sm" onClick={() => setConfirmId(b.id)}>
                                لغو نوبت
                              </button>
                            ) : (
                              <span className="t-s">
                                کمتر از {toPersianDigits(salon.cancel_hours ?? 24)} ساعت مانده؛ برای تغییر تماس بگیرید.
                              </span>
                            )
                          ) : (
                            <button type="button" className="btn gl sm" onClick={() => rebook(b)}>
                              <RotateCcw size={15} strokeWidth={1.5} />
                              رزرو دوباره
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <Confirm
          open={confirmId !== null}
          onClose={() => setConfirmId(null)}
          danger
          title="این نوبت لغو شود؟"
          okLabel="لغو نوبت"
          body="ساعت آزاد می‌شود و در گزارش فعالیت ثبت خواهد شد."
          onOk={() => void doCancel()}
        />
      </div>
    </SalonGuard>
  );
}
