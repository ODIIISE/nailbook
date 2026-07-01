"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Booking, Service } from "@/lib/mock-data";

interface EarningsModalProps {
  bookings: Booking[];
  services: Service[];
  paidBookings: Set<string>;
  currentDate: Date;
  onClose: () => void;
}

export function EarningsModal({
  bookings,
  services,
  paidBookings,
  currentDate,
  onClose,
}: EarningsModalProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  const earnings = useMemo(() => {
    const now = new Date(currentDate);

    let startDate: Date;
    if (period === "day") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filtered = bookings.filter((b) => {
      const d = new Date(b.date_gregorian);
      return d >= startDate && d <= now && b.status === "confirmed";
    });

    const paid = filtered
      .filter((b) => paidBookings.has(b.id))
      .reduce((sum, b) => {
        const svc = services.find((s) => s.id === b.service_id);
        return sum + (svc?.price || 0);
      }, 0);

    const unpaid = filtered
      .filter((b) => !paidBookings.has(b.id))
      .reduce((sum, b) => {
        const svc = services.find((s) => s.id === b.service_id);
        return sum + (svc?.price || 0);
      }, 0);

    return {
      paid,
      unpaid,
      total: paid + unpaid,
      count: filtered.length,
      paidCount: filtered.filter((b) => paidBookings.has(b.id)).length,
      unpaidCount: filtered.filter((b) => !paidBookings.has(b.id)).length,
    };
  }, [bookings, services, paidBookings, currentDate, period]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm glass rounded-3xl p-6 animate-scale max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h2 text-foreground">درآمد</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

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
                {toPersianDigits(earnings.paid.toLocaleString("fa-IR"))} تومان
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
                {toPersianDigits(earnings.unpaid.toLocaleString("fa-IR"))} تومان
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
                {toPersianDigits(earnings.total.toLocaleString("fa-IR"))} تومان
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
      </div>
    </div>
  );
}
