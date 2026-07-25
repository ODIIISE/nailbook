"use client";

import { MapPin, Phone, Clock, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/jalali";
import type { SalonInfo } from "@/lib/types";

interface HeroProps {
  salon: SalonInfo;
  onBookNow?: () => void;
}

function getWorkingHoursText(text: string): string {
  return text || "شنبه تا پنج شنبه . ۱۰ تا ۱۸";
}

export function Hero({ salon, onBookNow }: HeroProps) {
  return (
    <div className="px-4 pt-6 pb-4">
      <div className="mx-auto max-w-lg text-center animate-stagger">
        <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-muted overflow-hidden">
          {salon.logo_url ? (
            <img
              src={salon.logo_url}
              alt={salon.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <img src="/logo-placeholder.svg" alt="" className="w-10 h-10 opacity-60" />
          )}
        </div>
        <h1 className="text-display text-foreground mb-1.5">
          {salon.name}
        </h1>
        {salon.slogan && (
          <p className="mb-1.5 text-body text-foreground font-medium">
            {salon.slogan}
          </p>
        )}
        <p className="mb-5 text-caption text-muted-foreground">
          {salon.description}
        </p>

        <div className="rounded-2xl p-4 border border-border bg-card">
          <div className="space-y-2.5">
            <InfoRow icon={<MapPin className="h-4 w-4" />} text={salon.address} />
            <InfoRow icon={<Phone className="h-4 w-4" />} text={toPersianDigits(salon.phone)} dir="ltr" />
            <InfoRow icon={<Clock className="h-4 w-4" />} text={getWorkingHoursText(salon.working_hours_text)} />
          </div>
        </div>

        {onBookNow && (
          <Button
            className="w-full h-14 text-[16px] mt-5 bg-foreground text-background hover:bg-foreground/90"
            onClick={onBookNow}
          >
            رزرو کن
            <ChevronLeft className="h-5 w-5 ms-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, text, dir }: { icon: React.ReactNode; text: string; dir?: string }) {
  return (
    <div className="flex items-center gap-3 text-[14px] text-foreground/80">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
        {icon}
      </div>
      <span className="text-body" dir={dir}>{text}</span>
    </div>
  );
}
