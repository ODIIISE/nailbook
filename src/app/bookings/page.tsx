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
import { useAuth } from "@/lib/auth-context";
import { gregorianToJalali, toPersianDigits, formatJalaliTime, formatJalaliDateShort } from "@/lib/jalali";
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
  const { user } = useAuth();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const myBookings = useMemo(() => {
    if (!user) return [];
    return bookings
      .filter((b) => b.customer_phone === user.phone)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings, user]);

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || "نامعلوم";
  };

  const getAddonNames = (addonIds: string[]) => {
    return addonIds.map(id => addons.find(a => a.id === id)?.name || "").filter(Boolean);
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header showBack title="نوبت‌های من" onBack={() => router.back()} />
        <div className="px-4 py-12 text-center">
          <p className="text-muted-foreground">برای مشاهده نوبت‌ها وارد شوید</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-primary font-bold"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
        <CustomerNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header showBack title="نوبت‌های من" onBack={() => router.back()} />

      <div className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-3 animate-stagger">
          {myBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">هنوز نوبتی ثبت نکرده‌اید</p>
              <button
                onClick={() => router.push("/services")}
                className="mt-4 text-primary font-bold"
              >
                رزرو نوبت
              </button>
            </div>
          ) : (
            myBookings.map((booking) => {
              const jalali = gregorianToJalali(new Date(booking.date_gregorian));
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
                        {toPersianDigits(jalali.jd)} {JALALI_MONTHS[jalali.jm]}
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
                      {toPersianDigits(booking.service?.price?.toLocaleString("fa-IR") || "۰")} تومان
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          getServiceName={getServiceName}
          getAddonNames={getAddonNames}
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
}: {
  booking: Booking;
  onClose: () => void;
  getServiceName: (id: string) => string;
  getAddonNames: (ids: string[]) => string[];
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
              {toPersianDigits((booking.service?.price || 0).toLocaleString("fa-IR"))} تومان
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
