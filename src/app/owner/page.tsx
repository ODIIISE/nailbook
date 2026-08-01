"use client";

import { Suspense, useState, useMemo, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" aria-label="در حال بارگذاری رزرو دستی">
        <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 text-center text-sm text-muted-foreground">
          در حال آماده‌سازی فرم رزرو...
        </div>
      </div>
    ),
  }
);
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Ban, ChevronLeft, Plus } from "lucide-react";
import { formatPrice, toPersianDigits, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { useSalon } from "@/lib/salon-context";
import { getTehranDateKey, parseGregorianDateKey } from "@/lib/time";
import { calculateEarnings, calculateBookingPrice } from "@/lib/pricing";
import { toast } from "sonner";

function OwnerDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading, hasRole } = useAuth();
  const { loaded, bookings, services, addons, workingHours, blockedTimes, updateBlockedTimes, addOwnerBooking, cancelBooking, refreshBookings, toggleBookingPaid, updateBookingStatus } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showManualReserve, setShowManualReserve] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const selectedBooking = useMemo(() => bookings.find((b) => b.id === selectedBookingId) || null, [bookings, selectedBookingId]);
  const [showEarnings, setShowEarnings] = useState(false);

  // Owner-route guard: even though /api/owner/* endpoints check the DB, the
  // page itself should bounce a customer session before rendering the layout.
  // Depends directly on user/authLoading (no useRef one-shot) so a slow
  // /api/auth/me response still gets re-evaluated when the role arrives later.
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/owner/login");
      return;
    }
    if (!hasRole("owner")) {
      toast.error("دسترسی به بخش مدیریت ندارید");
      router.replace("/login");
    }
  }, [authLoading, user, hasRole, router]);

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

  // Refresh bookings: 10s polling + instant refresh on tab focus
  useEffect(() => {
    const id = setInterval(refreshBookings, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshBookings();
    };
    const handleFocus = () => refreshBookings();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayBookings = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return bookings
      .filter((b) => {
        const bookingDate = b.date_gregorian.split("T")[0];
        return bookingDate === dateStr && b.status !== "cancelled";
      })
      .map((b) => ({
        ...b,
        service: services.find((s) => s.id === b.service_id),
      }));
  }, [currentDate, bookings, services]);

  const dayBlockedTimes = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return blockedTimes.filter((b) => {
      const blockDate = b.date_gregorian.split("T")[0];
      return blockDate === dateStr;
    });
  }, [currentDate, blockedTimes]);

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

  const handleBlockTime = async (startTime: string, endTime: string, reason: string) => {
    // The blocked-time schema currently stores only the interval. Keep the
    // existing reason field in the modal until the database supports it.
    void reason;
    const dateStr = getTehranDateKey(currentDate);
    const saved = await updateBlockedTimes([
      ...blockedTimes,
      { date_gregorian: dateStr, start_time: startTime, end_time: endTime },
    ]);

    if (saved) {
      toast.success("زمان استراحت اضافه شد");
      setShowBlockTime(false);
    } else {
      toast.error("زمان استراحت ذخیره نشد", {
        description: "ممکن است با یک نوبت موجود تداخل داشته باشد",
      });
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
    if (saved) {
      toast.success("زمان استراحت حذف شد");
    } else {
      toast.error("حذف زمان استراحت انجام نشد");
    }
  };

  const handleManualReserve = async (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    start_time: string;
    end_time: string;
  }) => {
    const dateStr = getTehranDateKey(currentDate);
    const service = services.find((s) => s.id === data.service_id);
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
    });

    if (result.success) {
      toast.success("نوبت با موفقیت ثبت شد");
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
      <div className="px-4 py-4 space-y-4">
        <div className="animate-pulse text-muted-foreground text-center py-8">در حال بارگذاری...</div>
      </div>
    );
  }
  if (!user || !hasRole("owner")) return null;

  return (
    <SalonGuard>
    <>
      <div className="px-4 py-4 space-y-4">
        <JalaliCalendar
          selectedDate={currentDate}
          onSelectDate={setCurrentDate}
          showPast
        />

        {/* Full date display */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[13px] text-muted-foreground">تاریخ:</span>
            <span className="text-[17px] font-bold text-foreground">
              {(() => {
                const j = gregorianToJalali(currentDate);
                return formatJalaliDate(j.jy, j.jm, j.jd);
              })()}
            </span>
          </div>
        </div>

        {/* Today overview: revenue + count + next appointment, all in one compact strip. */}
        <Card className="p-4 surface-interactive">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-foreground">نمای کلی امروز</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEarnings(true)}
              className="gap-1 px-2 h-7 text-muted-foreground hover:text-foreground"
              aria-label="مشاهده جزئیات درآمد"
            >
              <span className="text-[12px]">جزئیات درآمد</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Revenue (lead KPI) */}
            <div className="space-y-0.5 text-start">
              <p className="text-[11px] text-muted-foreground font-medium">درآمد</p>
              <p dir="ltr" className="text-[20px] font-extrabold text-foreground tabular-nums tracking-tight leading-none">
                {formatPrice(accounting.paid)}
  </p>
              {accounting.unpaid > 0 ? (
                <p className="text-[10px] text-destructive font-semibold mt-0.5">
                  {toPersianDigits(formatPrice(accounting.unpaid))} طلب
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">تسویه شده</p>
              )}
            </div>

            {/* Bookings count */}
            <div className="space-y-0.5 text-start border-x border-border px-3">
              <p className="text-[11px] text-muted-foreground font-medium">نوبت</p>
              <p dir="ltr" className="text-[20px] font-extrabold text-foreground tabular-nums tracking-tight leading-none">
                {toPersianDigits(todayStats.count)}
  </p>
              {todayStats.unpaidCount > 0 ? (
                <p className="text-[10px] text-destructive font-semibold mt-0.5">
                  {toPersianDigits(todayStats.unpaidCount)} پرداخت نشده
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">پرداخت‌ها کامل</p>
              )}
            </div>

            {/* Next appointment */}
            <div className="space-y-0.5 text-start">
              <p className="text-[11px] text-muted-foreground font-medium">نوبت بعدی</p>
              <p dir="ltr" className="text-[20px] font-extrabold text-foreground tabular-nums tracking-tight leading-none">
                {todayStats.nextBooking
                  ? toPersianDigits(todayStats.nextBooking.start_time.slice(0, 5))
                  : "—"}
  </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-full">
                {todayStats.nextBooking?.customer_name || "خالی"}
              </p>
            </div>
          </div>
        </Card>

        {/* Primary timeline actions. Keep these close to the schedule so the
            owner can add a booking or protect time without hunting in a menu. */}
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="اقدامات برنامه روزانه">
          <Button
            type="button"
            variant="default"
            size="lg"
            className="h-12 w-full rounded-xl gap-2"
            onClick={() => setShowManualReserve(true)}
            disabled={!loaded}
            aria-busy={!loaded}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{loaded ? "رزرو دستی" : "در حال بارگذاری..."}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-12 w-full rounded-xl gap-2 border-border bg-card hover:bg-muted"
            onClick={() => setShowBlockTime(true)}
          >
            <Ban className="h-4 w-4" aria-hidden="true" />
            <span>افزودن زمان استراحت</span>
          </Button>
        </div>

        <Timeline
          bookings={dayBookings}
          blockedTimes={dayBlockedTimes}
          onSelectBooking={(booking) => setSelectedBookingId(booking?.id || null)}
          onRemoveBlock={handleRemoveBlock}
          addons={addons}
        />


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
          onTogglePaid={() => {
            toggleBookingPaid(selectedBooking.id, !selectedBooking.paid);
          }}
          onStatusChange={(status) => {
            updateBookingStatus(selectedBooking.id, status);
          }}
          onDelete={async (id) => {
            const success = await cancelBooking(id);
            if (success) {
              toast.success("نوبت لغو شد");
            } else {
              toast.error("خطا در لغو نوبت");
            }
            setSelectedBookingId(null);
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
    </>
    </SalonGuard>
  );
}

export default function OwnerDashboard() {
  return (
    <Suspense fallback={
      <div className="px-4 py-4 space-y-4">
        <div className="animate-pulse text-muted-foreground text-center py-8">در حال بارگذاری...</div>
      </div>
    }>
      <OwnerDashboardContent />
    </Suspense>
  );
}
