"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
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

function getPeriodRange(currentDate: Date, period: "day" | "week" | "month") {
  const now = new Date(currentDate);

  if (period === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (period === "week") {
    const start = new Date(now);
    const dayOfWeek = start.getDay();
    const daysSinceSaturday = (dayOfWeek + 1) % 7;
    start.setDate(start.getDate() - daysSinceSaturday);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: now };
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
        className="glass rounded-3xl p-6 max-h-[80vh] overflow-y-auto bg-black/40 backdrop-blur-sm"
      >
        <DialogTitle className="text-h2 text-foreground">درآمد</DialogTitle>

        <div className="flex gap-2 mb-4">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 h-9 rounded-full text-[13px] font-bold transition-all ${
                period === p
                  ? "bg-foreground text-background"
                  : "glass text-foreground hover:bg-white/60"
              }`}
            >
              {p === "day" ? "امروز" : p === "week" ? "این هفته" : "این ماه"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-success/10">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-[13px] text-foreground">پرداخت شده</span>
            </div>
            <div className="text-left">
              <p className="text-[15px] font-bold text-success">
                {formatPrice(earnings.paid)} تومان
              </p>
              <p className="text-[11px] text-muted-foreground">
                {toPersianDigits(earnings.paidCount)} نوبت
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-destructive/10">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-[13px] text-foreground">پرداخت نشده</span>
            </div>
            <div className="text-left">
              <p className="text-[15px] font-bold text-destructive">
                {formatPrice(earnings.unpaid)} تومان
              </p>
              <p className="text-[11px] text-muted-foreground">
                {toPersianDigits(earnings.unpaidCount)} نوبت
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-3 rounded-xl bg-foreground/5">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-foreground" />
              <span className="text-[13px] font-bold text-foreground">کل درآمد</span>
            </div>
            <div className="text-left">
              <p className="text-[17px] font-bold text-foreground">
                {formatPrice(earnings.total)} تومان
              </p>
              <p className="text-[11px] text-muted-foreground">
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
