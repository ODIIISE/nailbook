"use client";

import { toPersianDigits } from "@/lib/jalali";
import { CheckCircle } from "lucide-react";

interface TrustSignalsProps {
  totalBookings: number;
}

export function TrustSignals({ totalBookings }: TrustSignalsProps) {
  return (
    <div className="px-4 mb-4">
      <div className="mx-auto max-w-lg flex items-center justify-center gap-2 py-2 px-4">
        <CheckCircle className="h-4 w-4 text-success" />
        <span className="text-[13px] text-muted-foreground">
          <span className="font-bold text-foreground">{toPersianDigits(totalBookings.toLocaleString("fa-IR"))}+</span> رزرو موفق
        </span>
      </div>
    </div>
  );
}
