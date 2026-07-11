"use client";

import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { CheckCircle } from "lucide-react";

interface TrustSignalsProps {
  totalBookings: number;
}

export function TrustSignals({ totalBookings }: TrustSignalsProps) {
  return (
    <div className="px-4 mb-3">
      <div className="mx-auto max-w-lg flex items-center justify-center gap-2 py-2 px-4">
        <CheckCircle className="h-3.5 w-3.5 text-success" />
        <span className="text-[12px] text-muted-foreground">
          <span className="font-semibold text-foreground">{formatPrice(totalBookings)}+</span> رزرو موفق
        </span>
      </div>
    </div>
  );
}
