"use client";

import { useMemo, useState } from "react";
import { toPersianDigits } from "@/lib/jalali";
import { CheckCircle, Clock, ShieldCheck, Sparkles } from "lucide-react";
import type { Booking } from "@/lib/types";

interface TrustSignalsProps {
  totalBookings: number;
  recentBookings?: Booking[];
}

export function TrustSignals({ totalBookings, recentBookings = [] }: TrustSignalsProps) {
  const hasBookings = totalBookings > 0;

  // Compute how many bookings were created in the last 7 days
  const [weekAgo] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const recentCount = useMemo(() => {
    return recentBookings.filter((b) => new Date(b.created_at) > weekAgo).length;
  }, [recentBookings, weekAgo]);

  return (
    <div className="px-4 mb-3">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-3">
        {hasBookings ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-foreground">
                  {toPersianDigits(totalBookings.toLocaleString("en-US"))} رزرو موفق
                </p>
                <p className="text-[11px] text-muted-foreground">ثبت‌شده در این سالن</p>
              </div>
            </div>
            {recentCount > 0 && (
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">هفتهٔ گذشته</p>
                <p className="text-[13px] font-bold text-primary">+{toPersianDigits(recentCount)}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">رزرو آنلاین امن و سریع</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/50">
          <div className="flex flex-col items-center gap-1 text-center">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">رزرو ۲۴ ساعته</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">تایید تلفنی</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">کیفیت تضمینی</span>
          </div>
        </div>
      </div>
    </div>
  );
}
