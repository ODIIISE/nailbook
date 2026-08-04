"use client";

import { useState } from "react";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import Image from "next/image";
import type { SalonInfo } from "@/lib/types";

interface HeroProps {
  salon: SalonInfo;
}

function getWorkingHoursText(text: string): string {
  return text || "شنبه تا پنج‌شنبه · ۱۰ تا ۱۸";
}

export function Hero({ salon }: HeroProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [failedHeroUrl, setFailedHeroUrl] = useState<string | null>(null);
  const logoAvailable = Boolean(salon.logo_url) && failedLogoUrl !== salon.logo_url;
  const heroAvailable = Boolean(salon.hero_image_url) && failedHeroUrl !== salon.hero_image_url;
  const mapUrl = salon.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}`
    : null;

  return (
    <section className="home-editorial-hero px-4 pb-5 pt-5" aria-labelledby="salon-hero-title">
      <div className="mx-auto max-w-lg">
        <div className="home-hero-visual relative overflow-hidden rounded-[30px] bg-muted" dir="ltr">
          {heroAvailable ? (
            <Image
              src={salon.hero_image_url!}
              alt={`فضای ${salon.name}`}
              fill
              priority
              unoptimized
              sizes="(max-width: 512px) calc(100vw - 32px), 480px"
              className="home-cover-image object-cover"
              onError={() => setFailedHeroUrl(salon.hero_image_url)}
            />
          ) : (
            <div className="home-hero-fallback h-full w-full" aria-hidden="true">
              <span className="home-hero-fallback-word">NAIL STUDIO</span>
              <span className="home-hero-fallback-line" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
            <span className="text-[10px] font-bold tracking-[0.22em] text-white/80" dir="ltr">NAIL / CARE / RITUAL</span>
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border-4 border-white/90 bg-background shadow-floating">
              {logoAvailable ? (
                <Image
                  src={salon.logo_url!}
                  alt={`لوگوی ${salon.name}`}
                  width={68}
                  height={68}
                  unoptimized
                  className="h-full w-full object-cover"
                  onError={() => setFailedLogoUrl(salon.logo_url)}
                />
              ) : (
                <Sparkles className="h-7 w-7 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        <div className="home-hero-copy pt-5 text-right" dir="rtl">
          <p className="text-small font-bold tracking-[0.12em] text-[color:var(--home-accent-strong)]">استودیو تخصصی ناخن</p>
          <h1 id="salon-hero-title" className="mt-2 text-[30px] font-extrabold leading-[1.25] tracking-[-0.035em] text-foreground sm:text-[34px]">
            {salon.name}
          </h1>
          {salon.slogan ? (
            <p className="mt-2 max-w-[34ch] text-body text-muted-foreground">{salon.slogan}</p>
          ) : null}
        </div>

        <div className="home-essential-info mt-5 grid grid-cols-2 border-y border-border/80 text-right" dir="rtl">
          <div className="flex min-h-[62px] items-center gap-2.5 px-1 py-3 sm:px-2">
            <Clock3 className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">ساعات کاری</p>
              <p className="mt-1 line-clamp-2 text-small font-medium leading-5 text-foreground">{getWorkingHoursText(salon.working_hours_text)}</p>
            </div>
          </div>
          {salon.address ? (
            <a
              href={mapUrl ?? undefined}
              target={mapUrl ? "_blank" : undefined}
              rel={mapUrl ? "noopener noreferrer" : undefined}
              className="flex min-h-[62px] items-center gap-2.5 border-s border-border/80 px-1 py-3 text-right transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 sm:px-2"
              aria-label={`باز کردن آدرس ${salon.address} در نقشه`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">موقعیت سالن</p>
                <p className="mt-1 line-clamp-2 text-small font-medium leading-5 text-foreground">{salon.address}</p>
              </div>
            </a>
          ) : (
            <div className="flex min-h-[62px] items-center gap-2.5 border-s border-border/80 px-1 py-3 text-muted-foreground sm:px-2">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-small">آدرس ثبت نشده</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
