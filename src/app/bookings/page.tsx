"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, X } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { gregorianToJalali, toPersianDigits, formatJalaliTime } from "@/lib/jalali";
import type { Booking } from "@/lib/mock-data";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  confirmed: { label: "تایید شده", variant: "default" },
  pending: { label: "در انتظار", variant: "secondary" },
  completed: { label: "انجام شده", variant: "secondary" },
  cancelled: { label: "لغو شده", variant: "destructive" },
};

const JALALI_MONTHS = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function BookingsPage() {
  const router = useRouter();
  const { bookings, services, addons } = useSalon();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const allBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const dateA = new Date(a.date_gregorian).getTime();
        const dateB = new Date(b.date_gregorian).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.start_time.localeCompare(b.start_time);
      });
  }, [bookings]);

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || "نامعلوم";
  };

  const getAddonNames = (addonIds: string[]) => {
    return addonIds.map(id => addons.find(a => a.id === id)?.name || "").filter(Boolean);
  };

  const getServicePrice = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.price || 0;
  };

  const groupedByDate = useMemo(() => {
    const groups: { date: string; jalaliStr: string; bookings: Booking[] }[] = [];
    const map = new Map<string, Booking[]>();

    for (const b of allBookings) {
      const key = b.date_gregorian;
      if (!map.has(key)) {
        const jalali = gregorianToJalali(new Date(key));
        const jalaliStr = `${toPersianDigits(jalali.jd)} ${JALALI_MONTHS[jalali.jm]} ${toPersianDigits(jalali.jy)}`;
        groups.push({ date: key, jalaliStr, bookings: [] });
        map.set(key, groups[groups.length - 1].bookings);
      }
      map.get(key)!.push(b);
    }

    return groups;
  }, [allBookings]);

  return (
    <div className="min-h-screen">
      <Header title="نوبت‌های من" />

      <div className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-6">
          {allBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">هنوز نوبتی ثبت نشده است</p>
              <button
                onClick={() => router.push("/services")}
                className="mt-4 text-primary font-bold"
              >
                رزرو نوبت
              </button>
            </div>
          ) : (
            groupedByDate.map((group) => (
              <div key={group.date}>
                <p className="text-[13px] font-bold text-muted-foreground mb-2 px-1">
                  {group.jalaliStr}
                </p>
                <div className="space-y-2">
                  {group.bookings.map((booking) => {
                    const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
                    const time = booking.start_time.slice(0, 5);

                    return (
                      <Card
                        key={booking.id}
                        className="glass p-4 shadow-card cursor-pointer active:scale-[0.98] transition-all duration-150"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-foreground">
                              {getServiceName(booking.service_id)}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {booking.customer_name}
                            </p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatJalaliTime(time)}</span>
                          </div>
                          <span className="font-bold text-foreground">
                            {toPersianDigits(getServicePrice(booking.service_id).toLocaleString("fa-IR"))} تومان
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          getServiceName={getServiceName}
          getAddonNames={getAddonNames}
          getServicePrice={getServicePrice}
        />
      )}

      <CustomerNav />
    </div>
  );
}

function BookingDetailModal({
  booking,
  onClose,
  getServiceName,
  getAddonNames,
  getServicePrice,
}: {
  booking: Booking;
  onClose: () => void;
  getServiceName: (id: string) => string;
  getAddonNames: (ids: string[]) => string[];
  getServicePrice: (id: string) => number;
}) {
  const jalali = gregorianToJalali(new Date(booking.date_gregorian));
  const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
  const time = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);
  const addonNames = getAddonNames(booking.selected_addons || []);
  const shortId = booking.id.slice(-4).toUpperCase();

  const startMinutes = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
  const endMinutes = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
  const duration = endMinutes - startMinutes;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass rounded-t-3xl p-6 pb-8 animate-slideUp">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 text-foreground">جزئیات نوبت</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">خدمت</span>
            <span className="text-sm font-bold text-foreground">{getServiceName(booking.service_id)}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">مشتری</span>
            <span className="text-sm font-bold text-foreground">{booking.customer_name}</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">تاریخ</span>
            <span className="text-sm font-bold text-foreground">
              {toPersianDigits(jalali.jd)} {JALALI_MONTHS[jalali.jm]} {toPersianDigits(jalali.jy)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">ساعت</span>
            <span className="text-sm font-bold text-foreground">
              {formatJalaliTime(time)} تا {formatJalaliTime(endTime)}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">مدت</span>
            <span className="text-sm font-bold text-foreground">{toPersianDigits(duration)} دقیقه</span>
          </div>

          {addonNames.length > 0 && (
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm text-muted-foreground">آپشن‌ها</span>
              <span className="text-sm font-bold text-foreground">{addonNames.join("، ")}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">هزینه</span>
            <span className="text-base font-bold text-foreground">
              {toPersianDigits(getServicePrice(booking.service_id).toLocaleString("fa-IR"))} تومان
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">وضعیت</span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">کد رهگیری</span>
            <span className="text-sm font-bold text-foreground font-mono">#{shortId}</span>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full mt-6 h-12"
        >
          بستن
        </Button>
      </div>
    </div>
  );
}
