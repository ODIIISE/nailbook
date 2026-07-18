"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Clock, Calendar, User, ArrowLeft } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, gregorianToJalali, toPersianDigits, formatJalaliTime } from "@/lib/jalali";
import type { Booking } from "@/lib/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  confirmed: { label: "تایید شده", variant: "default" },
  pending: { label: "در انتظار", variant: "secondary" },
  completed: { label: "انجام شده", variant: "secondary" },
  cancelled: { label: "لغو شده", variant: "destructive" },
};

const JALALI_MONTHS = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, services, addons, cancelBooking } = useSalon();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Filter bookings by user_id OR customer_phone (handles both registered and guest bookings)
  const myBookings = useMemo(() => {
    if (!user) return [];
    return bookings
      .filter((b) => b.user_id === user.id || b.customer_phone === user.phone)
      .sort((a, b) => {
        const dateA = new Date(a.date_gregorian).getTime();
        const dateB = new Date(b.date_gregorian).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return b.start_time.localeCompare(a.start_time);
      });
  }, [bookings, user]);

  const getServiceName = (serviceId: string) => {
    return services.find((s) => s.id === serviceId)?.name || "نامعلوم";
  };

  const getAddonNames = (addonIds: string[]) => {
    return addonIds.map(id => addons.find(a => a.id === id)?.name || "").filter(Boolean);
  };

  const getServicePrice = (serviceId: string) => {
    return services.find(s => s.id === serviceId)?.price ?? null;
  };

  const groupedByDate = useMemo(() => {
    const groups: { date: string; jalaliStr: string; bookings: Booking[] }[] = [];
    const map = new Map<string, Booking[]>();

    for (const b of myBookings) {
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
  }, [myBookings]);

  // Not logged in — show login prompt
  if (!user) {
    return (
      <div className="min-h-screen">
        <AppHeader title="نوبت‌های من" />
        <div className="px-4 pt-6 pb-24">
          <div className="mx-auto max-w-lg">
            <div className="text-center py-16">
              <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-h3 text-foreground mb-2">وارد شوید</h2>
              <p className="text-[13px] text-muted-foreground mb-6 max-w-xs mx-auto">
                برای مشاهده نوبت‌های خود وارد حساب کاربری شوید
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="gap-2"
              >
                ورود
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <AppNavbar />
      </div>
    );
  }

  return (
    <SalonGuard>
    <div className="min-h-screen">
      <AppHeader title="نوبت‌های من" />

      <div className="px-4 pt-6 pb-24">
        <div className="mx-auto max-w-lg space-y-6">
          {myBookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-h3 text-foreground mb-2">نوبتی ندارید</h2>
              <p className="text-[13px] text-muted-foreground mb-6 max-w-xs mx-auto">
                هنوز نوبتی رزرو نکرده‌اید. همین الان اولین نوبت خود را بگیرید.
              </p>
              <Button
                onClick={() => router.push("/")}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                رزرو نوبت
              </Button>
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
                            {getServicePrice(booking.service_id) !== null
                              ? `${formatPrice(getServicePrice(booking.service_id)!)} تومان`
                              : "نامعلوم"}
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
          onCancel={(id) => {
            cancelBooking(id);
            setSelectedBooking(null);
          }}
          getServiceName={getServiceName}
          getAddonNames={getAddonNames}
          getServicePrice={getServicePrice}
        />
      )}

      <AppNavbar />
    </div>
    </SalonGuard>
  );
}

function BookingDetailModal({
  booking,
  onClose,
  onCancel,
  getServiceName,
  getAddonNames,
  getServicePrice,
}: {
  booking: Booking;
  onClose: () => void;
  onCancel: (id: string) => void;
  getServiceName: (id: string) => string;
  getAddonNames: (ids: string[]) => string[];
  getServicePrice: (id: string) => number | null;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const jalali = gregorianToJalali(new Date(booking.date_gregorian));
  const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
  const time = booking.start_time.slice(0, 5);
  const endTime = booking.end_time.slice(0, 5);
  const addonNames = getAddonNames(booking.selected_addons || []);
  const shortId = booking.id.slice(-4).toUpperCase();

  const startMinutes = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
  const endMinutes = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
  const duration = endMinutes - startMinutes;

  const canCancel = booking.status === "reserved" || booking.status === "confirmed";

  return (
    <>
      <Drawer open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent>
          <DrawerHeader>
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-h2">جزئیات نوبت</DrawerTitle>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-foreground/5">
                <span className="text-muted-foreground">✕</span>
              </button>
            </div>
          </DrawerHeader>

          <div className="px-6 pb-6 space-y-3 overflow-y-auto">
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
                {getServicePrice(booking.service_id) !== null
                  ? `${formatPrice(getServicePrice(booking.service_id)!)} تومان`
                  : "نامعلوم"}
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

          <DrawerFooter>
            {canCancel && (
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowConfirm(true)}
              >
                لغو نوبت
              </Button>
            )}
            <Button onClick={onClose} className="w-full h-12">
              بستن
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو نوبت</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید این نوبت را لغو کنید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onCancel(booking.id);
                onClose();
              }}
            >
              بله، لغو
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
