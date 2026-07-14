"use client";

import { useState, useMemo, useEffect } from "react";
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
import type { Booking } from "@/lib/types";

interface BlockedTime {
  date_gregorian: string;
  start_time: string;
  end_time: string;
}

export default function OwnerDashboard() {
  const { salon, bookings, services, addons, workingHours, blockedTimes, updateBlockedTimes, addBooking, cancelBooking, refreshBookings, toggleBookingPaid } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showManualReserve, setShowManualReserve] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showEarnings, setShowEarnings] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");

  // Poll for new bookings every 30 seconds
  useEffect(() => {
    const id = setInterval(refreshBookings, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dayBookings = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return bookings
      .filter((b) => {
        const bookingDate = b.date_gregorian.split("T")[0];
        if (bookingDate !== dateStr || b.status !== "confirmed") return false;
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

  const handleManualReserve = (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    start_time: string;
    end_time: string;
  }) => {
    const dateStr = getTehranDateKey(currentDate);
    const service = services.find((s) => s.id === data.service_id);
    const j = gregorianToJalali(currentDate);

    addBooking({
      id: crypto.randomUUID(),
      service_id: data.service_id,
      selected_addons: [],
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      date: `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}`,
      date_gregorian: dateStr,
      start_time: data.start_time,
      end_time: data.end_time,
      status: "confirmed",
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
