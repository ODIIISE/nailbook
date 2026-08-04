"use client";

import { useState } from "react";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import Image from "next/image";
import type { SalonInfo } from "@/lib/types";

interface HeroProps {
  salon: SalonInfo;
}

function getWorkingHoursText(text: string): string {
  return text || "شنبه تا پنج شنبه · ۱۰ تا ۱۸";
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
    <section className="px-4 pb-3 pt-5" aria-labelledby="salon-hero-title">
      <div className="home-profile-bento mx-auto max-w-lg overflow-hidden rounded-[24px] border border-border bg-card shadow-card">
        <div className="flex items-start gap-4 p-5" dir="rtl">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-border bg-muted">
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
          <div className="min-w-0 flex-1 pt-0.5 text-right">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold tracking-[0.18em] text-[color:var(--home-accent-strong)]" dir="ltr">FOREHAND</span>
              <span className="text-small font-medium text-muted-foreground">استودیو تخصصی ناخن</span>
            </div>
            <h1 id="salon-hero-title" className="mt-2 text-[26px] font-extrabold leading-[1.3] tracking-[-0.025em] text-foreground sm:text-[29px]">
              {salon.name}
            </h1>
            {salon.slogan && <p className="mt-1.5 text-caption font-medium text-[color:var(--home-accent-strong)]">{salon.slogan}</p>}
          </div>
        </div>

        {heroAvailable ? (
          <div className="relative h-28 overflow-hidden border-y border-border bg-muted">
            <Image
              src={salon.hero_image_url!}
              alt={`فضای ${salon.name}`}
              fill
              priority
              unoptimized
              sizes="(max-width: 512px) calc(100vw - 32px), 480px"
              className="object-cover"
              onError={() => setFailedHeroUrl(salon.hero_image_url)}
            />
            <div className="absolute inset-0 bg-gradient-to-l from-black/55 via-black/10 to-transparent" />
            <p className="absolute bottom-3 right-4 text-small font-medium text-white">یک قرار کوچک با خودت</p>
          </div>
        ) : (
          <div className="home-profile-art flex h-28 items-end justify-between border-y border-border px-4 pb-3" dir="ltr" aria-hidden="true">
            <span className="text-[10px] font-bold tracking-[0.22em] text-[color:var(--home-accent-strong)]">NAIL / CARE / RITUAL</span>
            <span className="text-4xl font-extrabold leading-none text-foreground/10">F</span>
          </div>
        )}

        <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border" dir="rtl">
          <div className="flex min-h-[58px] items-center gap-2.5 px-4 py-3">
            <Clock3 className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
            <div className="min-w-0 text-right">
              <p className="text-[10px] text-muted-foreground">ساعات کاری</p>
              <p className="mt-0.5 truncate text-small font-medium text-foreground">{getWorkingHoursText(salon.working_hours_text)}</p>
            </div>
          </div>
          {salon.address ? (
            <a
              href={mapUrl ?? undefined}
              target={mapUrl ? "_blank" : undefined}
              rel={mapUrl ? "noopener noreferrer" : undefined}
              className="flex min-h-[58px] items-center gap-2.5 px-4 py-3 text-right transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60"
              aria-label="باز کردن آدرس سالن در نقشه"
            >
              <MapPin className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">موقعیت</p>
                <p className="mt-0.5 line-clamp-2 text-small font-medium leading-5 text-foreground">{salon.address}</p>
              </div>
            </a>
          ) : (
            <div className="flex min-h-[58px] items-center gap-2.5 px-4 py-3 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-small">آدرس ثبت نشده</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
