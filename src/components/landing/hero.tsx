"use client";

import { useState } from "react";
import { Clock3, MapPin, Phone, Sparkles } from "lucide-react";
import Image from "next/image";
import { toPersianDigits } from "@/lib/jalali";
import type { SalonInfo } from "@/lib/types";

interface HeroProps {
  salon: SalonInfo;
  onBookNow?: () => void;
}

function getWorkingHoursText(text: string): string {
  return text || "شنبه تا پنج شنبه · ۱۰ تا ۱۸";
}

export function Hero({ salon }: HeroProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasHeroImage = Boolean(salon.hero_image_url) && failedImageUrl !== salon.hero_image_url;

  return (
    <section className="px-4 pb-3 pt-5" aria-labelledby="salon-hero-title">
      <div className="mx-auto max-w-lg">
        <div className="home-hero-stage relative min-h-[246px] overflow-hidden rounded-[28px]" dir="ltr">
          {hasHeroImage ? (
            <Image
              src={salon.hero_image_url!}
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 512px) calc(100vw - 32px), 480px"
              className="object-cover"
              onError={() => setFailedImageUrl(salon.hero_image_url)}
            />
          ) : (
            <>
              <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[color:var(--home-blush)]/70" />
              <div className="absolute -bottom-32 -right-10 h-72 w-72 rounded-full border border-[color:var(--home-ink)]/10" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(255,255,255,.18),transparent_36%),linear-gradient(135deg,var(--home-hero-start),var(--home-hero-end))]" />
              <div className="absolute left-8 top-12 h-20 w-20 rotate-12 rounded-[28px] border border-[color:var(--home-ink)]/10" />
              <div className="absolute bottom-8 right-12 h-12 w-12 -rotate-12 rounded-full border border-[color:var(--home-ink)]/10" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--home-overlay)] via-transparent to-[color:var(--home-overlay)]/10" />

          <div className="relative flex min-h-[246px] flex-col justify-between p-5 text-background" dir="rtl">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-[0.08em] text-background/80">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--home-blush)]" aria-hidden="true" />
                استودیو تخصصی ناخن
              </span>
              <span className="font-sans text-[10px] tracking-[0.2em] opacity-75">FOREHAND</span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-[20px] border border-white/35 bg-white/15 shadow-lg backdrop-blur-sm">
                  {salon.logo_url ? (
                    <Image src={salon.logo_url} alt="" width={56} height={56} unoptimized className="h-full w-full object-cover" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-white/90" aria-hidden="true" />
                  )}
                </div>
                <p className="text-small font-medium text-white/75">یک قرار کوچک با خودت</p>
              </div>
              <div className="h-12 w-12 shrink-0 rounded-full border border-white/30 bg-white/10" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="px-1 pt-5 text-right" dir="rtl">
          <h1 id="salon-hero-title" className="text-[30px] font-extrabold leading-[1.25] tracking-[-0.03em] text-foreground sm:text-[34px]">
            {salon.name}
          </h1>
          {salon.slogan && (
            <p className="mt-2 text-body font-medium text-[color:var(--home-accent-strong)]">{salon.slogan}</p>
          )}
          {salon.description && (
            <p className="mt-2 max-w-md text-caption leading-6 text-muted-foreground">{salon.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-small text-muted-foreground" aria-label="اطلاعات سالن">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <span>{salon.address}</span>
            </span>
            <span className="text-[color:var(--home-border-strong)]" aria-hidden="true">•</span>
            <span className="inline-flex items-center gap-1.5" dir="rtl">
              <Clock3 className="h-3.5 w-3.5 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <span>{getWorkingHoursText(salon.working_hours_text)}</span>
            </span>
            {salon.phone && (
              <a className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground" href={`tel:${salon.phone}`} dir="ltr" aria-label="تماس با سالن">
                <Phone className="h-3.5 w-3.5 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
                <span>{toPersianDigits(salon.phone)}</span>
              </a>
            )}
          </div>

          <a
            href="#booking-cta"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-booking-item)] bg-foreground px-4 text-body font-bold text-background shadow-xs transition-[background-color,box-shadow,transform] duration-200 hover:bg-foreground/85 hover:shadow-elevated active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2"
          >
            رزرو نوبت
            <span aria-hidden="true">←</span>
          </a>
        </div>
      </div>
    </section>
  );
}
