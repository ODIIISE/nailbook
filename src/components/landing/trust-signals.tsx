"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toPersianDigits } from "@/lib/jalali";

interface TrustSignalsProps {
  totalBookings: number;
}

export function TrustSignals({ totalBookings }: TrustSignalsProps) {
  return (
    <div className="px-4 mb-6">
      <Card className="mx-auto max-w-lg p-4 bg-card/80 backdrop-blur-sm">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">اعتماد شما</p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="bg-gold/10 text-gold border-gold/20">
              ✓ تایید شده
            </Badge>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {toPersianDigits(totalBookings.toLocaleString("fa-IR"))}+
          </p>
          <p className="text-sm text-muted-foreground">رزرو موفق</p>
        </div>
      </Card>
    </div>
  );
}
