"use client";

import { useMemo, useState } from "react";
import { toPersianDigits } from "@/lib/jalali";
import { Clock, ShieldCheck, Sparkles } from "lucide-react";
import type { Booking } from "@/lib/types";

interface TrustSignalsProps {
  totalBookings: number;
  recentBookings?: Booking[];
}

export function TrustSignals({ totalBookings, recentBookings = [] }: TrustSignalsProps) {
  const [weekAgo] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const recentCount = useMemo(() => {
    return recentBookings.filter((b) => new Date(b.created_at) > weekAgo).length;
  }, [recentBookings, weekAgo]);

  const features = [
    { icon: Clock, label: "رزرو ۲۴ ساعته" },
    { icon: ShieldCheck, label: "تایید تلفنی" },
    { icon: Sparkles, label: "کیفیت تضمینی" },
  ];

  return (
    <section className="px-4 py-1" aria-label="مزیت‌های رزرو">
      <div className="mx-auto flex max-w-lg items-center justify-center gap-5 border-y border-border/35 py-3 text-muted-foreground/65">
        {features.map(({ icon: Icon, label }) => (
          <div key={label} className="flex min-w-0 items-center gap-1.5 text-[10px] sm:text-[11px]">
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-75" strokeWidth={1.7} aria-hidden="true" />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
      {totalBookings > 0 && (
        <p className="mx-auto mt-2 max-w-lg text-center text-[10px] text-muted-foreground/55">
          {toPersianDigits(totalBookings.toLocaleString("en-US"))} رزرو موفق
          {recentCount > 0 ? ` · ${toPersianDigits(recentCount)} رزرو در هفتهٔ گذشته` : ""}
        </p>
      )}
    </section>
  );
}
