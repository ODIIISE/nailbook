"use client";

import { useState } from "react";
import { Clock3, MapPin, Phone, Sparkles } from "lucide-react";
import Image from "next/image";
import { toPersianDigits } from "@/lib/jalali";
import type { SalonInfo } from "@/lib/types";

interface HeroProps {
  salon: SalonInfo;
}

function getWorkingHoursText(text: string): string {
  return text || "شنبه تا پنج شنبه · ۱۰ تا ۱۸";
}

export function Hero({ salon }: HeroProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const logoAvailable = Boolean(salon.logo_url) && failedLogoUrl !== salon.logo_url;
  const mapUrl = salon.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}`
    : null;

  return (
    <section className="px-4 pb-4 pt-6" aria-labelledby="salon-hero-title">
      <div className="mx-auto max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-border bg-card shadow-card">
          {logoAvailable ? (
            <Image
              src={salon.logo_url!}
              alt={`لوگوی ${salon.name}`}
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
              onError={() => setFailedLogoUrl(salon.logo_url)}
            />
          ) : (
            <Sparkles className="h-6 w-6 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
          )}
        </div>

        <h1 id="salon-hero-title" className="mt-4 text-[27px] font-extrabold leading-[1.3] tracking-[-0.025em] text-foreground sm:text-[30px]">
          {salon.name}
        </h1>
        {salon.slogan && (
          <p className="mt-2 text-body font-medium text-[color:var(--home-accent-strong)]">{salon.slogan}</p>
        )}

        <div className="mx-auto mt-5 max-w-sm overflow-hidden rounded-[var(--radius-booking-item)] border border-border bg-card text-right" dir="rtl">
          <div className="flex min-h-12 items-center gap-3 border-b border-border px-3.5 py-2.5">
            <Clock3 className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-caption text-foreground">{getWorkingHoursText(salon.working_hours_text)}</span>
            <span className="text-small text-muted-foreground">ساعات کاری</span>
          </div>
          {salon.address && (
            <a
              href={mapUrl ?? undefined}
              target={mapUrl ? "_blank" : undefined}
              rel={mapUrl ? "noopener noreferrer" : undefined}
              className="flex min-h-12 items-center gap-3 px-3.5 py-2.5 text-right transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label="باز کردن آدرس سالن در نقشه"
            >
              <MapPin className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-caption leading-5 text-foreground">{salon.address}</span>
              <span className="text-small text-muted-foreground">موقعیت</span>
            </a>
          )}
          {salon.phone && (
            <a
              href={`tel:${salon.phone}`}
              className="flex min-h-12 items-center gap-3 border-t border-border px-3.5 py-2.5 text-right transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label="تماس با سالن"
            >
              <Phone className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-caption text-foreground" dir="ltr">{toPersianDigits(salon.phone)}</span>
              <span className="text-small text-muted-foreground">تماس</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
