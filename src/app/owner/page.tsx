"use client";

import { Suspense, useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { Seg } from "@/components/ui/seg";
import { Timeline } from "@/components/owner/timeline";
import { useAuth } from "@/lib/auth-context";
import dynamic from "next/dynamic";

const BlockTimeModal = dynamic(() => import("@/components/owner/block-time-modal").then(m => ({ default: m.BlockTimeModal })));
const BookingModal = dynamic(() => import("@/components/owner/booking-modal").then(m => ({ default: m.BookingModal })));
const EarningsModal = dynamic(() => import("@/components/owner/earnings-modal").then(m => ({ default: m.EarningsModal })));
const ManualReserveModal = dynamic(
  () => import("@/components/owner/manual-reserve-modal").then((m) => ({ default: m.ManualReserveModal })),
  {
    loading: () => (
      <div className="fixed inset-0 z-[var(--z-dialog)] flex items-end justify-center bg-black/40 backdrop-blur-sm" aria-label="در حال بارگذاری رزرو دستی">
        <div className="w-full max-w-lg bg-card p-6 text-center text-sm text-muted-foreground">
          در حال آماده‌سازی فرم رزرو...
        </div>
      </div>
    ),
  }
);
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Ban, ChevronLeft, Plus, ShieldAlert } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { useSalon } from "@/lib/salon-context";
import { getTehranDateKey, parseGregorianDateKey } from "@/lib/time";
import { getIranWeekDay } from "@/lib/slots";
import { useBookingsPolling } from "@/lib/hooks/use-bookings-polling";
import type { Service } from "@/lib/types";
import { calculateEarnings, calculateBookingPrice } from "@/lib/pricing";
import { toast } from "sonner";
import { handleAuthExpiry, handleForbidden } from "@/lib/db/data";

function OwnerDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const { salon, loaded, bookings, services, addons, workingHours, blockedTimes, specificDaysOff, updateBlockedTimes, addOwnerBooking, cancelBooking, rescheduleBooking, updateBookingMeta, refreshBookings, toggleBookingPaid, updateBookingStatus } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showManualReserve, setShowManualReserve] = useState(false);
  const [artists, setArtists] = useState<Array<{ id: string; name: string; phone?: string; specialty?: string }>>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const selectedBooking = useMemo(() => bookings.find((b) => b.id === selectedBookingId) || null, [bookings, selectedBookingId]);
  const [showEarnings, setShowEarnings] = useState(false);

  // Staff-route guard: even though /api/owner/* endpoints check the DB, the
  // page itself should bounce a non-staff session before rendering the layout.
  // Every staff role manages bookings, so bookings.manage is the entry test;
  // finer permissions gate individual surfaces (StaffGate) and actions.
  // Depends directly on user/authLoading (no useRef one-shot) so a slow
  // /api/auth/me response still gets re-evaluated when the role arrives later.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/owner/login");
      return;
    }
    if (!hasPermission("bookings.manage")) {
      toast.error("دسترسی به بخش مدیریت ندارید");
      router.replace("/login");
    }
  }, [authLoading, user, hasPermission, router]);

  // Show welcome toast on first login (use ref to prevent re-trigger)
  const welcomeShown = useRef(false);
  useEffect(() => {
    if (welcomeShown.current) return;
    if (searchParams.get("welcome") === "1") {
      welcomeShown.current = true;
      toast.success("خوش آمدید مدیر", {
        description: "ورود شما با موفقیت انجام شد",
        duration: 3000,
      });
      window.history.replaceState({}, "", "/owner");
    }
  }, [searchParams]);

  // Shared polling policy (owner scope).
  useBookingsPolling("owner");

  const dayBookings = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return bookings
      .filter((b) => {
        const bookingDate = b.date_gregorian.split("T")[0];
        return bookingDate === dateStr && b.status !== "cancelled";
      })
      .map((b) => ({
        ...b,
        // Deleted services NULL service_id server-side; fall back to the
        // creation-time name snapshot so the timeline stays readable.
        service: services.find((s) => s.id === b.service_id) ?? (b.service_name
          ? ({ id: b.service_id || "", name: b.service_name, description: "", price: 0, duration_minutes: 0, is_active: true, sort_order: 0, addon_ids: [], priority_score: 5, best_for: [] } as Service)
          : undefined),
      }));
  }, [currentDate, bookings, services]);

  const dayBlockedTimes = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return blockedTimes.filter((b) => {
      const blockDate = b.date_gregorian.split("T")[0];
      return blockDate === dateStr;
    });
  }, [currentDate, blockedTimes]);

  // Derive the visible hour window from the selected day's working hours and
  // blocked times. The previous hardcoded 8-22 clipped early-morning and
  // late-evening bookings out of the timeline entirely (overflow-hidden).
  const timelineRange = useMemo(() => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const dayHours = workingHours[getIranWeekDay(currentDate)];
    let start = dayHours ? Math.floor(toMinutes(dayHours.open) / 60) : 8;
    let end = dayHours ? Math.ceil(toMinutes(dayHours.close) / 60) : 22;
    for (const block of dayBlockedTimes) {
      start = Math.min(start, Math.floor(toMinutes(block.start_time) / 60));
      end = Math.max(end, Math.ceil(toMinutes(block.end_time) / 60));
    }
    start = Math.max(0, Math.min(start, 23));
    end = Math.min(24, Math.max(end, start + 1));
    // Keep a workable minimum span so a short day stays readable.
    if (end - start < 6) {
      const pad = Math.ceil((6 - (end - start)) / 2);
      start = Math.max(0, start - pad);
      end = Math.min(24, end + pad);
    }
    return { startHour: start, endHour: end };
  }, [currentDate, workingHours, dayBlockedTimes]);

  const accounting = useMemo(() => {
    const today = parseGregorianDateKey(getTehranDateKey(currentDate));
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    return calculateEarnings(bookings, services, addons, today, endOfToday);
  }, [currentDate, bookings, services, addons]);

  const todayStats = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    const todayBookings = bookings.filter((b) => {
      const bookingDate = b.date_gregorian.split("T")[0];
      return bookingDate === dateStr && b.status !== "cancelled";
    });
    const totalRevenue = todayBookings.reduce((sum, b) => sum + calculateBookingPrice(b, services, addons), 0);
    const unpaidCount = todayBookings.filter((b) => !b.paid).length;
    const nextBooking = [...todayBookings].sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
    return { count: todayBookings.length, revenue: totalRevenue, unpaidCount, nextBooking };
  }, [currentDate, bookings, services, addons]);

  /* Day capacity strip (v-2 kv row): awaiting + booked minutes + fill %. */
  const [timelineView, setTimelineView] = useState<"day" | "list">("day");
  const [listFilter, setListFilter] = useState<string>("all");
  const dayCapacity = useMemo(() => {
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const live = dayBookings.filter((b) => b.status !== "cancelled");
    const awaiting = live.filter((b) => b.status === "reserved").length;
    const minutes = live.reduce((sum, b) => sum + Math.max(0, toMin(b.end_time) - toMin(b.start_time)), 0);
    const openMinutes = Math.max(1, (timelineRange.endHour - timelineRange.startHour) * 60);
    return { awaiting, minutes, pct: Math.min(100, Math.round((minutes / openMinutes) * 100)) };
  }, [dayBookings, timelineRange]);
  const listBookings = useMemo(() => {
    const rows = (listFilter === "all" ? dayBookings : dayBookings.filter((b) => b.status === listFilter))
      .slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
    return rows;
  }, [dayBookings, listFilter]);

  /* Past customers for the manual-booking quick-pick. */
  const knownCustomers = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ name: string; phone: string }> = [];
    for (const b of bookings) {
      if (!b.customer_phone || seen.has(b.customer_phone)) continue;
      seen.add(b.customer_phone);
      out.push({ name: b.customer_name || "مشتری", phone: b.customer_phone });
    }
    return out;
  }, [bookings]);

  /* Artist directory for manual-booking assignment and booking meta edits.
     Loaded when either surface opens so the timeline itself never waits. */
  useEffect(() => {
    if (!showManualReserve && !selectedBookingId) return;
    void (async () => {
      try {
        const res = await fetch("/api/owner/artists", { credentials: "include" });
        if (handleAuthExpiry(res) || handleForbidden(res)) return;
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data.artists)) setArtists(data.artists);
      } catch {
        /* keep the previous list — the picker simply hides when empty */
      }
    })();
  }, [showManualReserve, selectedBookingId]);

  const handleBlockTime = async (dateKey: string, startTime: string, endTime: string, reason: string) => {
    const saved = await updateBlockedTimes([
      ...blockedTimes,
      { date_gregorian: dateKey, start_time: startTime, end_time: endTime, reason },
    ]);

    if (saved.success) {
      setShowBlockTime(false);
    } else {
      toast.error(saved.error || "زمان استراحت ذخیره نشد");
    }
  };

  const handleRemoveBlock = async (index: number) => {
    // Timeline indexes only the blocks for the selected day, while the
    // persisted array contains every day. Remove the exact object instead
    // of accidentally deleting another day's block at the same index.
    const target = dayBlockedTimes[index];
    if (!target) return;
    const globalIndex = blockedTimes.indexOf(target);
    if (globalIndex < 0) return;
    const saved = await updateBlockedTimes(blockedTimes.filter((_, i) => i !== globalIndex));
    if (saved.success) {
    } else {
      toast.error(saved.error || "حذف زمان استراحت انجام نشد");
    }
  };

  const handleManualReserve = async (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    start_time: string;
    end_time: string;
    artist_id?: string | null;
    note?: string;
  }) => {
    const dateStr = getTehranDateKey(currentDate);
    const service = services.find((s) => s.id === data.service_id && s.is_active);
    if (!service) {
      toast.error("خدمت انتخاب‌شده دیگر فعال نیست", {
        description: "لطفاً فرم را ببندید و دوباره باز کنید",
      });
      return;
    }
    const j = gregorianToJalali(currentDate);

    const result = await addOwnerBooking({
      id: crypto.randomUUID(),
      service_id: data.service_id,
      selected_addons: [],
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      date: `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`,
      date_gregorian: dateStr,
      start_time: data.start_time,
      end_time: data.end_time,
      status: "reserved",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
      service,
      artist_id: data.artist_id ?? null,
      note: data.note ?? "",
    });

    if (result.success) {
      // Reconcile the optimistic row with the server response immediately so
      // a polling request cannot leave a stale/nameless booking in the timeline.
      await refreshBookings("owner");
      setShowManualReserve(false);
    } else {
      toast.error(result.error || "خطا در ثبت نوبت");
    }
  };

  // Auth gate: don't render any owner UI until the session is validated.
  // Placed AFTER all hooks so React's rule-of-hooks invariant is preserved.
  // The redirect useEffect above handles navigation for bounced sessions.
  if (authLoading) {
    return (
      <div className="page-gutter py-6">
        <div className="panel center">در حال بارگذاری...</div>
      </div>
    );
  }
  // Never render a silent blank frame: if the session/role check failed or is
  // still unconfirmed, show an explicit state with a way forward instead of
  // null (the redirect effect above navigates away when it can).
  if (!user || !hasPermission("bookings.manage")) {
    return (
      <div className="page-gutter py-6">
        <div className="panel center">
          <ShieldAlert size={28} strokeWidth={1.2} aria-hidden="true" style={{ margin: "0 auto 10px", color: "var(--faint)" }} />
          <h3>دسترسی مدیریت بررسی نشد</h3>
          <p className="t-s">احراز هویت کامل نشد یا نشست منقضی شده است.</p>
          <button
            type="button"
            className="btn gl sm"
            style={{ marginTop: 14 }}
            onClick={() => router.replace("/owner/login")}
          >
            ورود مدیر
          </button>
        </div>
      </div>
    );
  }

  const selectedKey = getTehranDateKey(currentDate);
  const overviewTitle = selectedKey === getTehranDateKey(new Date())
    ? "نمای کلی امروز"
    : (() => {
        const j = gregorianToJalali(currentDate);
        return `نمای کلی ${formatJalaliDate(j.jy, j.jm, j.jd)}`;
      })();

  return (
    <SalonGuard>
      <div className="page-gutter space-y-5 pb-8 pt-2">
        <JalaliCalendar
          selectedDate={currentDate}
          onSelectDate={setCurrentDate}
          showPast
        />

        <p className="t-s center" aria-live="polite">
          {(() => {
            const j = gregorianToJalali(currentDate);
            return formatJalaliDate(j.jy, j.jm, j.jd);
          })()}
        </p>

        <section aria-label={overviewTitle}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h2 className="h-m">{overviewTitle}</h2>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setShowEarnings(true)}
              aria-label="مشاهده جزئیات درآمد"
            >
              جزئیات درآمد
              <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          <div className="kpi">
            <div>
              <b className="ltr num">{formatPrice(accounting.paid)}</b>
              {accounting.unpaid > 0 ? (
                <span style={{ color: "var(--wine-hi)" }}>{formatPrice(accounting.unpaid)} طلب</span>
              ) : (
                <span>تسویه شده</span>
              )}
            </div>
            <div>
              <b className="num">{toPersianDigits(todayStats.count)}</b>
              {todayStats.unpaidCount > 0 ? (
                <span style={{ color: "var(--wine-hi)" }}>{toPersianDigits(todayStats.unpaidCount)} پرداخت نشده</span>
              ) : (
                <span>پرداخت‌ها کامل</span>
              )}
            </div>
            <div>
              <b className="ltr num">
                {todayStats.nextBooking ? toPersianDigits(todayStats.nextBooking.start_time.slice(0, 5)) : "—"}
              </b>
              <span>{todayStats.nextBooking?.customer_name || "نوبت بعدی خالی"}</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="اقدامات برنامه روزانه">
          <button
            type="button"
            className="btn pri block"
            onClick={() => setShowManualReserve(true)}
            disabled={!loaded}
            aria-busy={!loaded}
          >
            <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
            <span>{loaded ? "رزرو دستی" : "در حال بارگذاری..."}</span>
          </button>
          <button
            type="button"
            className="btn gl block"
            onClick={() => setShowBlockTime(true)}
          >
            <Ban size={17} strokeWidth={1.6} aria-hidden="true" />
            <span>زمان استراحت</span>
          </button>
        </div>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <p className="t-s num">
            {toPersianDigits(dayBookings.length)} نوبت · {toPersianDigits(dayCapacity.awaiting)} منتظر تأیید · {toPersianDigits(dayCapacity.pct)}٪ پر
          </p>
          <div style={{ flex: "none", width: "min(200px, 44%)" }}>
            <Seg
              value={timelineView}
              onChange={setTimelineView}
              label="نمای برنامه"
              options={[
                { value: "day", label: "تایم‌لاین" },
                { value: "list", label: "فهرست" },
              ]}
            />
          </div>
        </div>

        {timelineView === "day" ? (
        <Timeline
          bookings={dayBookings}
          blockedTimes={dayBlockedTimes}
          startHour={timelineRange.startHour}
          endHour={timelineRange.endHour}
          onSelectBooking={(booking) => setSelectedBookingId(booking?.id || null)}
          onRemoveBlock={handleRemoveBlock}
          addons={addons}
        />
        ) : (
          <section aria-label="فهرست نوبت‌ها">
            <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              {[["all", "همه"], ["reserved", "رزرو شده"], ["confirmed", "تأیید شده"], ["in_progress", "در حال انجام"], ["completed", "انجام شده"], ["cancelled", "لغو شده"]].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={listFilter === v}
                  onClick={() => setListFilter(v)}
                  className={`chip${listFilter === v ? " on" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {listBookings.length === 0 ? (
              <p className="empty">نوبتی برای نمایش نیست.</p>
            ) : (
              <ul className="list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {listBookings.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingId(b.id)}
                      className="row"
                      style={{ width: "100%", padding: "12px 0", textAlign: "start" }}
                      aria-label={`مشاهده نوبت ${b.customer_name}`}
                    >
                      <span className="ltr num" style={{ flex: "none", width: 52, fontSize: 15 }}>{toPersianDigits(b.start_time.slice(0, 5))}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <b style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 400, fontSize: 15 }}>{b.customer_name}</b>
                        <small className="mute" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>{b.service?.name || "نامعلوم"}</small>
                      </span>
                      <StatusPill status={b.status} />
                      <span className="num" style={{ flex: "none", fontSize: 13 }}>{formatPrice(calculateBookingPrice(b, services, addons))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}


      </div>

      {showBlockTime && (
        <BlockTimeModal
          date={currentDate}
          workingHours={workingHours}
          onBlock={handleBlockTime}
          onCancel={() => setShowBlockTime(false)}
        />
      )}

      {showManualReserve && (
        <ManualReserveModal
          date={currentDate}
          services={services}
          workingHours={workingHours}
          slotIntervalMinutes={salon?.slot_interval_minutes}
          slotBufferMinutes={salon?.slot_buffer_minutes}
          knownCustomers={knownCustomers}
          artists={artists}
          onReserve={handleManualReserve}
          onClose={() => setShowManualReserve(false)}
        />
      )}

      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          services={services}
          addons={addons}
          isPaid={selectedBooking.paid}
          customerHistory={(() => {
            const same = bookings.filter((b) => b.customer_phone === selectedBooking.customer_phone && b.id !== selectedBooking.id);
            return {
              completed: same.filter((b) => b.status === "completed").length,
            };
          })()}
          onTogglePaid={async () => {
            await toggleBookingPaid(selectedBooking.id, !selectedBooking.paid);
          }}
          canTogglePaid={hasPermission("bookings.paid")}
          artists={artists}
          onUpdateMeta={(meta) => selectedBooking ? updateBookingMeta(selectedBooking.id, meta) : Promise.resolve({ success: false })}
          onStatusChange={async (status) => {
            await updateBookingStatus(selectedBooking.id, status);
          }}
          onDelete={async (id) => {
            const result = await cancelBooking(id);
            if (result.success) {
            } else {
              toast.error(result.error || "خطا در لغو نوبت");
            }
            setSelectedBookingId(null);
          }}
          rescheduleContext={{
            workingHours,
            bookings,
            blockedTimes,
            specificDaysOff,
            engine: {
              slot_interval_minutes: salon.slot_interval_minutes,
              slot_buffer_minutes: salon.slot_buffer_minutes,
              proximity_window_hours: salon.proximity_window_hours,
              early_extra_hours: salon.early_extra_hours,
              late_extra_hours: salon.late_extra_hours,
              expand_threshold: salon.expand_threshold,
              allow_overflow: salon.allow_overflow,
              overflow_minutes: salon.overflow_minutes,
              optimization_mode: salon.optimization_mode,
              suggestion_limit: salon.suggestion_limit,
              min_useful_gap_minutes: salon.min_useful_gap_minutes,
            },
          }}
          onReschedule={async (date_gregorian, start_time, end_time) => {
            if (!selectedBooking) return { success: false, error: "نوبت یافت نشد" };
            const result = await rescheduleBooking(selectedBooking.id, date_gregorian, start_time, end_time);
            if (result.success) {
              toast.success("نوبت جابه‌جا شد");
              void refreshBookings("owner");
            }
            return result;
          }}
          onClose={() => setSelectedBookingId(null)}
        />
      )}

      {showEarnings && (
        <EarningsModal
          bookings={bookings}
          services={services}
          addons={addons}
          currentDate={currentDate}
          onClose={() => setShowEarnings(false)}
        />
      )}
    </SalonGuard>
  );
}

export default function OwnerDashboard() {
  return (
    <Suspense fallback={
      <div className="px-4 py-4 space-y-4">
        <div className=" text-muted-foreground text-center py-8">در حال بارگذاری...</div>
      </div>
    }>
      <OwnerDashboardContent />
    </Suspense>
  );
}
