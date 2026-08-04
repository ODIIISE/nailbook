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
    <section className="px-4 pb-3 pt-6" aria-labelledby="salon-hero-title">
      <div className="mx-auto max-w-lg text-center">
        {heroAvailable ? (
          <figure className="relative h-[142px] overflow-hidden rounded-[28px] bg-muted shadow-card">
            <Image
              src={salon.hero_image_url!}
              alt={`فضای ${salon.name}`}
              fill
              priority
              unoptimized
              sizes="(max-width: 512px) calc(100vw - 32px), 480px"
              className="home-cover-image object-cover transition-transform duration-700"
              onError={() => setFailedHeroUrl(salon.hero_image_url)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" aria-hidden="true" />
            <span className="absolute bottom-3 left-4 text-[10px] font-bold tracking-[0.2em] text-white/80" dir="ltr">NAIL STUDIO</span>
          </figure>
        ) : (
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] border border-[color:var(--home-border-strong)] bg-[color:var(--home-blush-light)] text-[color:var(--home-accent-strong)] shadow-card" aria-hidden="true">
            <Sparkles className="h-7 w-7" />
          </div>
        )}

        <div className={heroAvailable ? "relative -mt-8 px-4" : "px-2"} dir="rtl">
          {heroAvailable && (
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border-4 border-background bg-muted shadow-elevated">
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
          )}
          {!heroAvailable && logoAvailable && (
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-border bg-muted shadow-card">
              <Image
                src={salon.logo_url!}
                alt={`لوگوی ${salon.name}`}
                width={64}
                height={64}
                unoptimized
                className="h-full w-full object-cover"
                onError={() => setFailedLogoUrl(salon.logo_url)}
              />
            </div>
          )}

          <p className="text-[10px] font-bold tracking-[0.2em] text-[color:var(--home-accent-strong)]">استودیو تخصصی ناخن</p>
          <h1 id="salon-hero-title" className="mt-2 text-[27px] font-extrabold leading-[1.3] tracking-[-0.025em] text-foreground sm:text-[30px]">
            {salon.name}
          </h1>
          {salon.slogan && <p className="mt-1.5 text-caption font-medium text-muted-foreground">{salon.slogan}</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 divide-x divide-x-reverse divide-border border-y border-border/70 text-right" dir="rtl">
          <div className="flex min-h-[58px] items-center gap-2.5 px-3 py-3">
            <Clock3 className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">ساعات کاری</p>
              <p className="mt-0.5 line-clamp-2 text-small font-medium leading-5 text-foreground">{getWorkingHoursText(salon.working_hours_text)}</p>
            </div>
          </div>
          {salon.address ? (
            <a
              href={mapUrl ?? undefined}
              target={mapUrl ? "_blank" : undefined}
              rel={mapUrl ? "noopener noreferrer" : undefined}
              className="flex min-h-[58px] items-center gap-2.5 px-3 py-3 text-right transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60"
              aria-label={`باز کردن آدرس ${salon.address} در نقشه`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">موقعیت</p>
                <p className="mt-0.5 line-clamp-2 text-small font-medium leading-5 text-foreground">{salon.address}</p>
              </div>
            </a>
          ) : (
            <div className="flex min-h-[58px] items-center gap-2.5 px-3 py-3 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-small">آدرس ثبت نشده</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
