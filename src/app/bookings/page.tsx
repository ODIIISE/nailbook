"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { gregorianToJalali, toPersianDigits, formatJalaliTime } from "@/lib/jalali";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  confirmed: { label: "تایید شده", variant: "default" },
  pending: { label: "در انتظار", variant: "secondary" },
  completed: { label: "انجام شده", variant: "secondary" },
  cancelled: { label: "لغو شده", variant: "destructive" },
};

export default function BookingsPage() {
  const router = useRouter();
  const { bookings, services } = useSalon();
  const { user } = useAuth();

  const myBookings = useMemo(() => {
    if (!user) return [];
    return bookings
      .filter((b) => b.customer_phone === user.phone)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings, user]);

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || "نامعلوم";
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
                onClick={() => router.push("/book")}
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
                <Card key={booking.id} className="glass p-4 shadow-card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {getServiceName(booking.service_id)}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {toPersianDigits(jalali.jd)} {["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"][jalali.jm]}
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

      <CustomerNav />
    </div>
  );
}
