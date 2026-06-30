"use client";

import { Card } from "@/components/ui/card";
import { MapPin, Phone, Clock } from "lucide-react";
import type { SalonInfo } from "@/lib/mock-data";

interface HeroProps {
  salon: SalonInfo;
}

export function Hero({ salon }: HeroProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-rose/10 to-transparent" />
      <div className="relative px-4 pt-8 pb-6">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-navy/10 text-3xl">
            💅
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">
            {salon.name}
          </h1>
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            {salon.description}
          </p>
          <Card className="p-3 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-rose" />
              <span>{salon.address}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0 text-rose" />
              <span dir="ltr">{salon.phone}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 text-rose" />
              <span>شنبه تا چهارشنبه · ۱۰:۰۰ تا ۱۸:۰۰</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
