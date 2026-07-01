"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgendaTimeline } from "@/components/owner/agenda-timeline";
import { BlockTimeModal } from "@/components/owner/block-time-modal";
import { BookingModal } from "@/components/owner/booking-modal";
import { Menu, X, Settings, Clock, Briefcase, Home, LogOut } from "lucide-react";
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
  const { salon, bookings, services, blockedTimes, updateBlockedTimes, refreshBookings } = useSalon();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showBlockTime, setShowBlockTime] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paidBookings, setPaidBookings] = useState<Set<string>>(new Set());

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
    const newBlock = {
      date_gregorian: dateStr,
      start_time: startTime,
      end_time: endTime,
    };
    updateBlockedTimes([...blockedTimes, newBlock]);
    setShowBlockTime(false);
  };

  const handleRemoveBlock = (id: string) => {
    updateBlockedTimes(blockedTimes.filter((b) => b.start_time !== id || b.date_gregorian !== currentDate.toISOString().split("T")[0]));
  };

  return (
    <div className="min-h-screen ">
      <div className="sticky top-0 z-10 glass-strong h-14">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center justify-between">
          <h1 className="text-[17px] font-bold text-foreground">{salon.name}</h1>
          <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-72 glass-strong rounded-l-3xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[17px] font-bold text-foreground">منو</span>
                <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => { router.push("/"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">صفحه اصلی</span>
                </button>

                <Separator className="my-2 bg-white/20" />

                <button
                  onClick={() => { router.push("/owner/settings"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">تنظیمات</span>
                </button>

                <button
                  onClick={() => { router.push("/owner/schedule"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">ساعات کاری</span>
                </button>

                <button
                  onClick={() => { router.push("/owner/services"); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/30 text-right transition-colors"
                >
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[15px]">مدیریت خدمات</span>
                </button>

                <Separator className="my-2 bg-white/20" />

                <button
                  onClick={() => {
                    document.cookie = "owner_session=; path=/owner; max-age=0";
                    router.push("/owner/login");
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-red-500/10 text-right transition-colors"
                >
                  <LogOut className="h-4 w-4 text-red-500" />
                  <span className="text-[15px] text-red-500">خروج</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/owner/settings")}
          >
            تنظیمات
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/owner/schedule")}
          >
            ساعات کاری
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => router.push("/owner/services")}
          >
            خدمات
          </Button>
        </div>
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
          paidBookings={paidBookings}
          onPrevDay={prevDay}
          onNextDay={nextDay}
          onSelectBooking={setSelectedBooking}
          onRemoveBlock={handleRemoveBlock}
        />

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
      </div>
    </div>
  );
}
