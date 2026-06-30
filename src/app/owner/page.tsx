"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgendaTimeline } from "@/components/owner/agenda-timeline";
import { BlockTimeModal } from "@/components/owner/block-time-modal";

import { toPersianDigits, formatJalaliDate, gregorianToJalali } from "@/lib/jalali";
import { useSalon } from "@/lib/salon-context";

interface BlockedTime {
  id: string;
  date_gregorian: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const { salon, bookings, services, refreshBookings } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);

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

  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayBookings = bookings.filter(
      (b) => b.date_gregorian === today && b.status === "confirmed"
    );
    return {
      count: todayBookings.length,
      revenue: todayBookings.reduce((sum, b) => {
        const service = services.find((s) => s.id === b.service_id);
        return sum + (service?.price || 0);
      }, 0),
    };
  }, [bookings, services]);

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
    const newBlock: BlockedTime = {
      id: Date.now().toString(),
      date_gregorian: dateStr,
      start_time: startTime,
      end_time: endTime,
      reason: reason || "استراحت",
    };
    setBlockedTimes((prev) => [...prev, newBlock]);
    setShowBlockTime(false);
  };

  const handleRemoveBlock = (id: string) => {
    setBlockedTimes((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-warm-white">
      <div className="sticky top-0 z-10 bg-warm-white/95 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-foreground">{salon.name}</h1>
              <p className="text-xs text-muted-foreground">داشبورد مدیر</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/owner/settings")}
              >
                تنظیمات
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/owner/schedule")}
              >
                ساعات کاری
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push("/owner/services")}
              >
                خدمات
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {toPersianDigits(todayStats.count)}
            </p>
            <p className="text-xs text-muted-foreground">نوبت امروز</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {toPersianDigits(todayStats.revenue.toLocaleString("fa-IR"))}
            </p>
            <p className="text-xs text-muted-foreground">درآمد امروز (تومان)</p>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">برنامه</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBlockTime(!showBlockTime)}
          >
            + مسدود کردن زمان
          </Button>
        </div>

        {showBlockTime && (
          <BlockTimeModal
            date={currentDate}
            onBlock={handleBlockTime}
            onCancel={() => setShowBlockTime(false)}
          />
        )}

        <AgendaTimeline
          bookings={dayBookings}
          blockedTimes={dayBlockedTimes}
          date={currentDate}
          onPrevDay={prevDay}
          onNextDay={nextDay}
          onSelectBooking={setSelectedBooking}
          onRemoveBlock={handleRemoveBlock}
        />

        {selectedBooking && (
          <Card className="p-4">
            <h3 className="font-semibold mb-2">جزئیات نوبت</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">نام</span>
                <span>{selectedBooking.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تلفن</span>
                <span dir="ltr">{selectedBooking.customer_phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ساعت</span>
                <span>{selectedBooking.start_time} - {selectedBooking.end_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">وضعیت</span>
                <Badge variant={selectedBooking.status === "confirmed" ? "default" : "secondary"}>
                  {selectedBooking.status === "confirmed" ? "تایید شده" : selectedBooking.status}
                </Badge>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setSelectedBooking(null)}
              >
                لغو نوبت
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedBooking(null)}
              >
                بستن
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
