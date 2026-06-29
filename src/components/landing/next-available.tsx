"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { formatJalaliDateShort, formatJalaliTime } from "@/lib/jalali";
import { gregorianToJalali } from "@/lib/jalali";

interface NextAvailableProps {
  date: Date | null;
  time: string | null;
  onBookNow: () => void;
}

export function NextAvailable({ date, time, onBookNow }: NextAvailableProps) {
  if (!date || !time) return null;

  const jalali = gregorianToJalali(date);

  return (
    <div className="px-4 mb-6">
      <Card className="mx-auto max-w-lg overflow-hidden border-rose/20 bg-gradient-to-l from-rose/5 to-gold/5">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-rose/10 text-rose border-rose/20">
              <Calendar className="h-3 w-3 ml-1" />
              نزدیک‌ترین زمان
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">
                {formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd)}
              </p>
              <p className="text-sm text-muted-foreground">
                ساعت {formatJalaliTime(time)}
              </p>
            </div>
            <Button onClick={onBookNow} className="bg-rose hover:bg-rose/90 text-white">
              رزرو کن
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
