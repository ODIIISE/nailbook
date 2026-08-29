"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatPrice, toPersianDigits, getJalaliDate, jalaliToGregorian } from "@/lib/jalali";
import { parseGregorianDateKey, getTehranDateKey } from "@/lib/time";
import { calculateEarnings } from "@/lib/pricing";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Booking, Service, Addon } from "@/lib/types";

interface EarningsModalProps {
  bookings: Booking[];
  services: Service[];
  addons: Addon[];
  currentDate: Date;
  onClose: () => void;
}

// All ranges are anchored on UTC-noon date keys (what booking rows compare
// with) so a booking on the period's last day is never excluded by a
// time-of-day mismatch — the old local-midnight ranges dropped today's
// bookings whenever "now" was before noon UTC.
function getPeriodRange(currentDate: Date, period: "day" | "week" | "month") {
  const today = parseGregorianDateKey(getTehranDateKey(currentDate));

  if (period === "day") {
    return { start: today, end: today };
  }

  if (period === "week") {
    // Iranian week starts on Saturday.
    const start = new Date(today);
    while (start.getUTCDay() !== 6) {
      start.setUTCDate(start.getUTCDate() - 1);
    }
    const endOfPeriod = new Date(start);
    endOfPeriod.setUTCDate(endOfPeriod.getUTCDate() + 6);
    const end = endOfPeriod.getTime() > today.getTime() ? today : endOfPeriod;
    return { start, end };
  }

  // Jalali month of the anchor date — a Gregorian month boundary meant
  // "این ماه" disagreed with the owner's calendar.
  const { year, month } = getJalaliDate(currentDate);
  const start = jalaliToGregorian(year, month, 1);
  const nextMonthStart = jalaliToGregorian(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1);
  const lastDay = new Date(nextMonthStart);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  const end = lastDay.getTime() > today.getTime() ? today : lastDay;
  return { start, end };
}

export function EarningsModal({
  bookings,
  services,
  addons,
  currentDate,
  onClose,
}: EarningsModalProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const earnings = useMemo(() => {
    const { start, end } = getPeriodRange(currentDate, period);
    return calculateEarnings(bookings, services, addons, start, end);
  }, [bookings, services, addons, currentDate, period]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="rounded-2xl p-6 max-h-[80vh] overflow-y-auto bg-card border border-border"
      >
        <DialogTitle className="text-h2 text-foreground">درآمد</DialogTitle>

        <div className="flex gap-2 mb-4">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 h-9 rounded-full text-caption font-bold transition-all ${
                period === p
                  ? "bg-foreground text-background"
                  : "border border-border text-foreground hover:bg-muted"
              }`}
            >
              {p === "day" ? "این روز" : p === "week" ? "این هفته" : "این ماه"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-success/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-caption text-foreground">پرداخت شده</span>
            </div>
            <div className="text-start">
              <p className="text-body font-bold text-success">
                {formatPrice(earnings.paid)} تومان
              </p>
              <p className="text-small text-muted-foreground">
                {toPersianDigits(earnings.paidCount)} نوبت
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-caption text-foreground">پرداخت نشده</span>
            </div>
            <div className="text-start">
              <p className="text-body font-bold text-destructive">
                {formatPrice(earnings.unpaid)} تومان
              </p>
              <p className="text-small text-muted-foreground">
                {toPersianDigits(earnings.unpaidCount)} نوبت
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-3 rounded-xl bg-foreground/5">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-foreground" />
              <span className="text-caption font-bold text-foreground">کل درآمد</span>
            </div>
            <div className="text-start">
              <p className="text-body-lg font-bold text-foreground">
                {formatPrice(earnings.total)} تومان
              </p>
              <p className="text-small text-muted-foreground">
                {toPersianDigits(earnings.count)} نوبت
              </p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full mt-4" onClick={onClose}>
          بستن
        </Button>
      </DialogContent>
    </Dialog>
  );
}
