"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Timeline } from "@/components/owner/timeline";
import { BlockTimeModal } from "@/components/owner/block-time-modal";
import { BookingModal } from "@/components/owner/booking-modal";
import { EarningsModal } from "@/components/owner/earnings-modal";
import { ManualReserveModal } from "@/components/owner/manual-reserve-modal";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { SalonGuard } from "@/components/ui/salon-guard";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { toPersianDigits, formatPrice, gregorianToJalali, formatJalaliDate } from "@/lib/jalali";
import { useSalon } from "@/lib/salon-context";
import { getTehranDateKey } from "@/lib/time";
import { calculateEarnings } from "@/lib/pricing";
import { toast } from "sonner";
import type { Booking } from "@/lib/types";

interface BlockedTime {
  date_gregorian: string;
  start_time: string;
  end_time: string;
}

export default function OwnerDashboard() {
  const searchParams = useSearchParams();
  const { salon, bookings, services, addons, workingHours, blockedTimes, updateBlockedTimes, addBooking, cancelBooking, refreshBookings, toggleBookingPaid, updateBookingStatus } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showManualReserve, setShowManualReserve] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEarnings, setShowEarnings] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");

  // Show welcome toast on first login
  useEffect(() => {
    if (searchParams.get("welcome") === "1") {
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
        if (bookingDate !== dateStr || b.status === "cancelled") return false;
        if (!bookingSearch) return true;
        const q = bookingSearch.toLowerCase();
        return (
          b.customer_name.toLowerCase().includes(q) ||
          b.customer_phone.includes(q)
        );
      })
      .map((b) => ({
        ...b,
        service: services.find((s) => s.id === b.service_id),
      }));
  }, [currentDate, bookings, services, bookingSearch]);

  const dayBlockedTimes = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return blockedTimes.filter((b) => {
      const blockDate = b.date_gregorian.split("T")[0];
      return blockDate === dateStr;
    });
  }, [currentDate, blockedTimes]);

  const accounting = useMemo(() => {
    const today = new Date(getTehranDateKey(currentDate));
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    return calculateEarnings(bookings, services, addons, today, endOfToday);
  }, [currentDate, bookings, services, addons]);

  const handleBlockTime = (startTime: string, endTime: string, reason: string) => {
    const dateStr = getTehranDateKey(currentDate);
    updateBlockedTimes([...blockedTimes, { date_gregorian: dateStr, start_time: startTime, end_time: endTime }]);
    setShowBlockTime(false);
  };

  const handleRemoveBlock = (index: number) => {
    updateBlockedTimes(blockedTimes.filter((_, i) => i !== index));
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

    // Check if user exists, if not create a placeholder
    let userId: string | undefined;
    try {
      const checkRes = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: data.customer_phone }),
      });
      const checkData = await checkRes.json();
      if (!checkData.exists) {
        // Create placeholder user with just phone number (no PIN — user sets their own on first login)
        const createRes = await fetch("/api/owner/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            phone: data.customer_phone,
            name: data.customer_name || "مشتری",
            role: "customer",
          }),
        });
        const createData = await createRes.json();
        if (createData.userId) userId = createData.userId;
      }
    } catch (e) {
      console.error("Failed to ensure user:", e);
    }

    addBooking({
      id: crypto.randomUUID(),
      user_id: userId,
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

    setShowManualReserve(false);
  };

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

        {/* Search bookings */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={bookingSearch}
            onChange={(e) => setBookingSearch(e.target.value)}
            placeholder="جستجوی نام یا شماره مشتری..."
            className="pr-10"
          />
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-bold text-foreground">حساب امروز</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setShowEarnings(true)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[13px] text-muted-foreground">پرداخت شده</p>
              <p className="text-[15px] font-bold text-success">
                {formatPrice(accounting.paid)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-muted-foreground">پرداخت نشده</p>
              <p className="text-[15px] font-bold text-destructive">
                {formatPrice(accounting.unpaid)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-muted-foreground">کل</p>
              <p className="text-[15px] font-bold text-foreground">
                {formatPrice(accounting.total)}
              </p>
            </div>
          </div>
        </Card>

        <Timeline
          bookings={dayBookings}
          blockedTimes={dayBlockedTimes}
          onSelectBooking={setSelectedBooking}
          onRemoveBlock={handleRemoveBlock}
          addons={addons}
        />

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowBlockTime(true)}
          >
            <Plus className="h-4 w-4 ml-1" />
            مسدود کردن زمان
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowManualReserve(true)}
          >
            <Plus className="h-4 w-4 ml-1" />
            رزرو دستی
          </Button>
        </div>
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
          onDelete={(id) => {
            cancelBooking(id);
            setSelectedBooking(null);
          }}
          onClose={() => setSelectedBooking(null)}
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
