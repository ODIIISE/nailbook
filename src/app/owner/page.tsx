"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgendaTimeline } from "@/components/owner/agenda-timeline";
import { BlockTimeModal } from "@/components/owner/block-time-modal";
import { BookingModal } from "@/components/owner/booking-modal";
import { EarningsModal } from "@/components/owner/earnings-modal";
import { ManualReserveModal } from "@/components/owner/manual-reserve-modal";
import { JalaliCalendar } from "@/components/booking/jalali-calendar";
import { ChevronLeft, Plus } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { useSalon } from "@/lib/salon-context";
import { getTehranDateKey } from "@/lib/time";

interface BlockedTime {
  date_gregorian: string;
  start_time: string;
  end_time: string;
}

export default function OwnerDashboard() {
  const { salon, bookings, services, blockedTimes, updateBlockedTimes, addBooking, refreshBookings } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [showManualReserve, setShowManualReserve] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [paidBookings, setPaidBookings] = useState<Set<string>>(new Set());
  const [showEarnings, setShowEarnings] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshBookings();
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshBookings]);

  const dayBookings = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return bookings.filter(
      (b) => b.date_gregorian === dateStr && b.status === "confirmed"
    ).map((b) => ({
      ...b,
      service: services.find((s) => s.id === b.service_id),
    }));
  }, [currentDate, bookings, services]);

  const dayBlockedTimes = useMemo(() => {
    const dateStr = getTehranDateKey(currentDate);
    return blockedTimes.filter((b) => b.date_gregorian === dateStr);
  }, [currentDate, blockedTimes]);

  const accounting = useMemo(() => {
    const today = getTehranDateKey(currentDate);
    const todayBookings = bookings.filter(
      (b) => b.date_gregorian === today && b.status === "confirmed"
    );

    const paid = todayBookings
      .filter((b) => paidBookings.has(b.id))
      .reduce((sum, b) => {
        const svc = services.find((s) => s.id === b.service_id);
        return sum + (svc?.price || 0);
      }, 0);

    const unpaid = todayBookings
      .filter((b) => !paidBookings.has(b.id))
      .reduce((sum, b) => {
        const svc = services.find((s) => s.id === b.service_id);
        return sum + (svc?.price || 0);
      }, 0);

    return { paid, unpaid, total: paid + unpaid };
  }, [currentDate, bookings, services, paidBookings]);

  const handleBlockTime = (startTime: string, endTime: string, reason: string) => {
    const dateStr = getTehranDateKey(currentDate);
    updateBlockedTimes([...blockedTimes, { date_gregorian: dateStr, start_time: startTime, end_time: endTime }]);
    setShowBlockTime(false);
  };

  const handleRemoveBlock = (id: string) => {
    updateBlockedTimes(blockedTimes.filter((b) => b.start_time !== id || b.date_gregorian !== getTehranDateKey(currentDate)));
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

    addBooking({
      id: crypto.randomUUID(),
      service_id: data.service_id,
      selected_addons: [],
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      date: "",
      date_gregorian: dateStr,
      start_time: data.start_time + ":00",
      end_time: data.end_time + ":00",
      status: "confirmed",
      phone_verified: true,
      paid: false,
      created_at: new Date().toISOString(),
      service,
    });

    setShowManualReserve(false);
  };

  return (
    <>
      <div className="px-4 py-4 space-y-4">
        <JalaliCalendar
          selectedDate={currentDate}
          onSelectDate={setCurrentDate}
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
                {toPersianDigits(accounting.paid.toLocaleString("fa-IR"))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-muted-foreground">پرداخت نشده</p>
              <p className="text-[15px] font-bold text-destructive">
                {toPersianDigits(accounting.unpaid.toLocaleString("fa-IR"))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[13px] text-muted-foreground">کل</p>
              <p className="text-[15px] font-bold text-foreground">
                {toPersianDigits(accounting.total.toLocaleString("fa-IR"))}
              </p>
            </div>
          </div>
        </Card>

        <AgendaTimeline
          bookings={dayBookings}
          blockedTimes={dayBlockedTimes}
          date={currentDate}
          paidBookings={paidBookings}
          onPrevDay={() => {}}
          onNextDay={() => {}}
          onSelectBooking={setSelectedBooking}
          onRemoveBlock={handleRemoveBlock}
        />
      </div>

      {showBlockTime && (
        <BlockTimeModal
          date={currentDate}
          onBlock={handleBlockTime}
          onCancel={() => setShowBlockTime(false)}
        />
      )}

      {showManualReserve && (
        <ManualReserveModal
          date={currentDate}
          services={services}
          onReserve={handleManualReserve}
          onClose={() => setShowManualReserve(false)}
        />
      )}

      {selectedBooking && (
        <BookingModal
          booking={selectedBooking}
          isPaid={paidBookings.has(selectedBooking.id)}
          onTogglePaid={() => {
            setPaidBookings((prev) => {
              const next = new Set(prev);
              if (next.has(selectedBooking.id)) {
                next.delete(selectedBooking.id);
              } else {
                next.add(selectedBooking.id);
              }
              return next;
            });
          }}
          onClose={() => setSelectedBooking(null)}
        />
      )}

      {showEarnings && (
        <EarningsModal
          bookings={bookings}
          services={services}
          paidBookings={paidBookings}
          currentDate={currentDate}
          onClose={() => setShowEarnings(false)}
        />
      )}
    </>
  );
}
