"use client";

import { toPersianDigits } from "@/lib/jalali";
import { CheckCircle2 } from "lucide-react";

interface TrustSignalsProps {
  totalBookings: number;
}

export function TrustSignals({ totalBookings }: TrustSignalsProps) {
  if (totalBookings === 0) return null;

  return (
    <section className="px-4 py-1" aria-label="اطمینان برای رزرو">
      <div className="mx-auto flex max-w-lg items-center justify-center gap-3 text-muted-foreground">
        <span className="h-px w-8 bg-border" aria-hidden="true" />
        <div className="flex items-center gap-1.5 text-small"><CheckCircle2 className="h-4 w-4 text-[color:var(--home-accent-strong)]" aria-hidden="true" /><span>{toPersianDigits(totalBookings.toLocaleString("en-US"))} نوبت با موفقیت انجام شده</span></div>
        <span className="h-px w-8 bg-border" aria-hidden="true" />
      </div>
    </section>
  );
}
