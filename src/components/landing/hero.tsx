"use client";

import { MapPin, Phone, Clock, ChevronLeft, ArrowLeft } from "lucide-react";
import Image from "next/image";
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
        <div className="relative mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-muted overflow-hidden">
          {salon.logo_url ? (
            <Image
              src={salon.logo_url}
              alt={salon.name}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <Image src="/logo-placeholder.svg" alt="" width={40} height={40} className="opacity-60" unoptimized />
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
          <div className="mt-5 rounded-[24px] border border-border/80 bg-card p-3.5 text-right shadow-card">
            <div className="flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="text-h3 text-foreground">وقتت را برای زیبایی رزرو کن</p>
                <p className="mt-1 text-caption text-muted-foreground">
                  خدمت را انتخاب کن و زمان‌های آزاد را ببین.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <Button
              className="mt-4 h-14 w-full rounded-2xl bg-foreground text-[16px] font-bold text-background shadow-sm transition-transform hover:bg-foreground/90 active:scale-[0.99]"
              onClick={onBookNow}
            >
              رزرو نوبت
              <ChevronLeft className="h-5 w-5 ms-1" aria-hidden="true" />
            </Button>
          </div>
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
