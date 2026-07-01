"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgendaTimeline } from "@/components/owner/agenda-timeline";
import { BlockTimeModal } from "@/components/owner/block-time-modal";
import { BookingModal } from "@/components/owner/booking-modal";
import { EarningsModal } from "@/components/owner/earnings-modal";
import { Calendar, Clock, Briefcase, Settings, ChevronLeft } from "lucide-react";
import { toPersianDigits, gregorianToJalali } from "@/lib/jalali";
import { useSalon } from "@/lib/salon-context";

interface BlockedTime {
  date_gregorian: string;
  start_time: string;
  end_time: string;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const { salon, bookings, services, blockedTimes, updateBlockedTimes, refreshBookings } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
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
    const dateStr = currentDate.toISOString().split("T")[0];
    return bookings.filter(
      (b) => b.date_gregorian === dateStr && b.status === "confirmed"
    ).map((b) => ({
      ...b,
      service: services.find((s) => s.id === b.service_id),
    }));
  }, [currentDate, bookings, services]);

  const dayBlockedTimes = useMemo(() => {
    const dateStr = currentDate.toISOString().split("T")[0];
    return blockedTimes.filter((b) => b.date_gregorian === dateStr);
  }, [currentDate, blockedTimes]);

  const accounting = useMemo(() => {
    const today = currentDate.toISOString().split("T")[0];
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

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleBlockTime = (startTime: string, endTime: string, reason: string) => {
    const dateStr = currentDate.toISOString().split("T")[0];
    updateBlockedTimes([...blockedTimes, { date_gregorian: dateStr, start_time: startTime, end_time: endTime }]);
    setShowBlockTime(false);
  };

  const handleRemoveBlock = (id: string) => {
    updateBlockedTimes(blockedTimes.filter((b) => b.start_time !== id || b.date_gregorian !== currentDate.toISOString().split("T")[0]));
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold text-foreground">{salon.name}</h1>
            <Badge variant="secondary" className="text-[10px]">
              {toPersianDigits(dayBookings.length)} نوبت
            </Badge>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowBlockTime(true)}>
            <span className="text-[13px] font-bold text-primary">+ مسدود</span>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
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
          onPrevDay={prevDay}
          onNextDay={nextDay}
          onSelectBooking={setSelectedBooking}
          onRemoveBlock={handleRemoveBlock}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-border">
        <div className="mx-auto max-w-lg flex">
          <button
            onClick={() => router.push("/owner")}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-primary"
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-bold">زمان‌بندی</span>
          </button>
          <button
            onClick={() => router.push("/owner/schedule")}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Clock className="h-5 w-5" />
            <span className="text-[10px] font-bold">ساعات کاری</span>
          </button>
          <button
            onClick={() => router.push("/owner/services")}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Briefcase className="h-5 w-5" />
            <span className="text-[10px] font-bold">خدمات</span>
          </button>
          <button
            onClick={() => router.push("/owner/settings")}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-bold">تنظیمات</span>
          </button>
        </div>
      </div>

      {showBlockTime && (
        <BlockTimeModal
          date={currentDate}
          onBlock={handleBlockTime}
          onCancel={() => setShowBlockTime(false)}
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
    </div>
  );
}
