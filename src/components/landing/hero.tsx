"use client";

import { Card } from "@/components/ui/card";
import { MapPin, Phone, Clock, Sparkles } from "lucide-react";
import type { SalonInfo } from "@/lib/mock-data";

interface HeroProps {
  salon: SalonInfo;
}

function getWorkingHoursText(hours: Record<string, { open: string; close: string } | null>): string {
  const activeDays = Object.entries(hours).filter(([, v]) => v !== null);
  if (activeDays.length === 0) return "تعطیل";
  const firstDay = activeDays[0][1]!;
  const daysMap: Record<string, string> = {
    sat: "شنبه", sun: "یکشنبه", mon: "دوشنبه", tue: "سه‌شنبه",
    wed: "چهارشنبه", thu: "پنجشنبه", fri: "جمعه",
  };
  const dayNames = activeDays.map(([k]) => daysMap[k]).filter(Boolean);
  const startDay = dayNames[0];
  const endDay = dayNames[dayNames.length - 1];
  return `${startDay} تا ${endDay} · ${firstDay.open.slice(0, 5)} تا ${firstDay.close.slice(0, 5)}`;
}

export function Hero({ salon }: HeroProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="relative px-4 pt-8 pb-6">
        <div className="mx-auto max-w-lg text-center animate-stagger">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 animate-spring">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-h1 text-foreground">
            {salon.name}
          </h1>
          {salon.slogan && (
            <p className="mb-2 text-body text-primary font-medium">
              {salon.slogan}
            </p>
          )}
          <p className="mb-4 text-body text-muted-foreground leading-relaxed">
            {salon.description}
          </p>
          <Card className="p-4 bg-card/80 backdrop-blur-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-body text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <span>{salon.address}</span>
              </div>
              <div className="flex items-center gap-3 text-body text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <span dir="ltr">{salon.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-body text-muted-foreground">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <span>{getWorkingHoursText(salon.working_hours)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
