"use client";

import { useMemo, useState } from "react";
import { toPersianDigits } from "@/lib/jalali";
import { CheckCircle2, Clock3 } from "lucide-react";
import type { Booking } from "@/lib/types";

interface TrustSignalsProps {
  totalBookings: number;
  recentBookings?: Booking[];
}

export function TrustSignals({ totalBookings, recentBookings = [] }: TrustSignalsProps) {
  const [weekAgo] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const recentCount = useMemo(() => recentBookings.filter((booking) => new Date(booking.created_at) > weekAgo).length, [recentBookings, weekAgo]);
  if (totalBookings === 0 && recentCount === 0) return null;

  return (
    <section className="px-4 py-2" aria-label="اطمینان برای رزرو">
      <div className="mx-auto flex max-w-lg items-center justify-center gap-5 border-y border-border/60 py-3 text-muted-foreground">
        {totalBookings > 0 && <div className="flex items-center gap-1.5 text-small"><CheckCircle2 className="h-4 w-4 text-[color:var(--home-accent-strong)]" aria-hidden="true" /><span>{toPersianDigits(totalBookings.toLocaleString("en-US"))} نوبت انجام‌شده</span></div>}
        {recentCount > 0 && <div className="flex items-center gap-1.5 text-small"><Clock3 className="h-4 w-4 text-[color:var(--home-accent-strong)]" aria-hidden="true" /><span>{toPersianDigits(recentCount)} نوبت این هفته</span></div>}
      </div>
    </section>
  );
}
