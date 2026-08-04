"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Drawer, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Clock, Calendar, User, ArrowLeft, ChevronLeft, Sparkles } from "lucide-react";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useSalon } from "@/lib/salon-context";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { formatPrice, gregorianToJalali, toPersianDigits, formatJalaliTime } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";
import type { Booking } from "@/lib/types";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; accent: string }> = {
  reserved: { label: "ثبت شده", variant: "secondary", accent: "#2563EB" },
  confirmed: { label: "تایید شده", variant: "default", accent: "#16A34A" },
  pending: { label: "در انتظار", variant: "secondary", accent: "#F59E0B" },
  completed: { label: "انجام شده", variant: "secondary", accent: "#9CA3AF" },
  cancelled: { label: "لغو شده", variant: "destructive", accent: "#DC2626" },
};

const JALALI_MONTHS = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

export default function BookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, services, addons, cancelBooking, refreshBookings } = useSalon();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Refresh bookings: 10s polling + instant refresh on tab focus
  useEffect(() => {
    // Event listeners pass their event object; keep the scoped data-loader
    // signature separate so a browser event can never be interpreted as a
    // booking-read scope.
    const refresh = () => { void refreshBookings(); };
    const id = window.setInterval(refresh, 10000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, [refreshBookings]);

  // Filter bookings by user_id OR customer_phone (handles both registered and guest bookings)
  const myBookings = useMemo(() => {
    if (!user) return [];
    return bookings
      .filter((b) => b.user_id === user.id || b.customer_phone === user.phone)
      .sort((a, b) => {
        const dateA = parseGregorianDateKey(a.date_gregorian).getTime();
        const dateB = parseGregorianDateKey(b.date_gregorian).getTime();
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
        const jalali = gregorianToJalali(parseGregorianDateKey(key));
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
              <p className="text-caption text-muted-foreground mb-6 max-w-xs mx-auto">
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
        <PullToRefresh onRefresh={refreshBookings}>
        <div className="mx-auto max-w-lg space-y-6">
          {myBookings.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-h3 text-foreground mb-2">نوبتی ندارید</h2>
              <p className="text-caption text-muted-foreground mb-6 max-w-xs mx-auto">
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
                <p className="text-caption font-bold text-muted-foreground mb-2 px-1">
                  {group.jalaliStr}
                </p>
                <div className="space-y-2.5">
                  {group.bookings.map((booking) => {
                    const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
                    const time = booking.start_time.slice(0, 5);
                    const endTime = booking.end_time.slice(0, 5);
                    const startM = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
                    const endM = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
                    const duration = endM >= startM ? endM - startM : endM + 24 * 60 - startM;
                    const addonNames = getAddonNames(booking.selected_addons || []);
                    const shortId = booking.id.slice(-4).toUpperCase();
                    const price = getServicePrice(booking.service_id);

                    return (
                      <Card
                        key={booking.id}
                        className="w-full glass shadow-card cursor-pointer active:scale-[0.98] transition-all duration-150 overflow-hidden"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-stretch">
                          {/* Status accent bar */}
                          <div
                            className="w-[4px] shrink-0"
                            style={{ backgroundColor: status.accent }}
                            aria-hidden="true"
                          />
                          <div className="flex-1 p-4 min-w-0">
                            {/* Header: service + customer + badge */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-bold text-foreground truncate">
                                    {getServiceName(booking.service_id)}
                                  </h3>
                                  <p className="text-small text-muted-foreground mt-0.5 truncate">
                                    {booking.customer_name}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={status.variant} className="shrink-0">
                                {status.label}
                              </Badge>
                            </div>

                            {/* Time + duration */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="font-semibold text-foreground">
                                  {formatJalaliTime(time)}
                                </span>
                                <span className="text-muted-foreground/70">
                                  تا {formatJalaliTime(endTime)}
                                </span>
                              </div>
                              <span className="text-small text-muted-foreground">
                                {toPersianDigits(duration)} دقیقه
                              </span>
                            </div>

                            {/* Addon chips */}
                            {addonNames.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2.5">
                                {addonNames.map((name) => (
                                  <span
                                    key={name}
                                    className="px-2 py-0.5 rounded-full bg-muted text-small font-semibold text-muted-foreground"
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Footer: price + tracking + chevron */}
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                              <span className="font-bold text-foreground">
                                {price !== null ? `${formatPrice(price)} تومان` : "نامعلوم"}
                              </span>
                              <div className="flex items-center gap-1 text-small text-muted-foreground">
                                <span className="font-mono tabular-nums" dir="ltr">
                                  #{shortId}
                                </span>
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        </PullToRefresh>
      </div>

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={async (id) => {
            try {
              await cancelBooking(id);
              toast.success("نوبت لغو شد");
              setSelectedBooking(null);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "خطا در لغو نوبت");
            }
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
  const jalali = gregorianToJalali(parseGregorianDateKey(booking.date_gregorian));
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
