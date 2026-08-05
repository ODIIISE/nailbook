"use client";

import { useState } from "react";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import Image from "next/image";
import type { SalonInfo } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";
import { getTehranNow } from "@/lib/time";

interface HeroProps {
  salon: SalonInfo;
  workingHours: WorkingHours;
}

function parseMinutes(value: string): number | null {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getTehranWeekdayKey(): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
  }).format(new Date());
  const keys: Record<string, string> = {
    Sat: "sat",
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
  };
  return keys[weekday] ?? "sat";
}

function getLiveStatus(workingHours: WorkingHours): { open: boolean; label: string } {
  const today = workingHours[getTehranWeekdayKey()];
  if (!today) return { open: false, label: "امروز تعطیل است" };

  const now = getTehranNow().minutes;
  const openAt = parseMinutes(today.open);
  const closeAt = parseMinutes(today.close);
  if (openAt === null || closeAt === null) return { open: false, label: "ساعات کاری ثبت نشده" };
  if (now >= openAt && now < closeAt) return { open: true, label: `باز است · تا ${today.close}` };
  if (now < openAt) return { open: false, label: `بازگشایی ساعت ${today.open}` };
  return { open: false, label: "امروز بسته است" };
}

export function Hero({ salon, workingHours }: HeroProps) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const [failedHeroUrl, setFailedHeroUrl] = useState<string | null>(null);
  const logoAvailable = Boolean(salon.logo_url) && failedLogoUrl !== salon.logo_url;
  const heroAvailable = Boolean(salon.hero_image_url) && failedHeroUrl !== salon.hero_image_url;
  const liveStatus = getLiveStatus(workingHours);
  const mapUrl = salon.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}`
    : null;

  return (
    <section className="home-option-a-hero mx-auto" aria-labelledby="salon-hero-title">
      <div className="home-option-a-cover relative overflow-hidden bg-muted" dir="ltr">
        {heroAvailable ? (
          <Image
            src={salon.hero_image_url!}
            alt={`فضای ${salon.name}`}
            fill
            priority
            unoptimized
            sizes="(max-width: 512px) 100vw, 512px"
            className="home-option-a-cover-image object-cover"
            onError={() => setFailedHeroUrl(salon.hero_image_url)}
          />
        ) : (
          <div className="home-option-a-cover-fallback h-full w-full" aria-hidden="true">
            <span>{salon.name || "NAIL STUDIO"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" aria-hidden="true" />
      </div>

      <div className="home-option-a-profile mx-auto max-w-lg px-5 text-center" dir="rtl">
        <div className="home-option-a-avatar mx-auto flex items-center justify-center overflow-hidden bg-background">
          {logoAvailable ? (
            <Image
              src={salon.logo_url!}
              alt={`لوگوی ${salon.name}`}
              width={112}
              height={112}
              unoptimized
              className="h-full w-full object-cover"
              onError={() => setFailedLogoUrl(salon.logo_url)}
            />
          ) : (
            <Sparkles className="h-8 w-8 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
          )}
        </div>

        <p className="mt-4 text-[10px] font-extrabold tracking-[0.2em] text-[color:var(--home-accent-strong)]">استودیو تخصصی ناخن</p>
        <h1 id="salon-hero-title" className="mt-1 font-serif text-[38px] font-bold leading-tight tracking-[-0.03em] text-foreground">
          {salon.name}
        </h1>
        {salon.slogan ? <p className="mt-1 text-body text-muted-foreground">{salon.slogan}</p> : null}

        <div className="mt-4 flex flex-col items-center gap-2 text-small text-muted-foreground">
          {salon.address ? (
            <a
              href={mapUrl ?? undefined}
              target={mapUrl ? "_blank" : undefined}
              rel={mapUrl ? "noopener noreferrer" : undefined}
              className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full px-3 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={`باز کردن آدرس ${salon.address} در نقشه`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
              <span className="truncate">{salon.address}</span>
            </a>
          ) : null}
          <div className="inline-flex min-h-11 items-center gap-2 px-3 py-2" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${liveStatus.open ? "bg-success" : "bg-muted-foreground/50"}`} aria-hidden="true" />
            <Clock3 className="h-4 w-4 text-[color:var(--home-accent-strong)]" aria-hidden="true" />
            <span className={liveStatus.open ? "font-semibold text-success" : ""}>{liveStatus.label}</span>
          </div>
        </div>

        <div className="home-option-a-hours mt-3 border-t border-border/80 pt-3 text-small text-muted-foreground">
          <span className="font-semibold text-foreground">ساعات کاری</span>
          <span aria-hidden="true"> · </span>
          <span>{salon.working_hours_text || "ساعات کاری ثبت نشده"}</span>
        </div>
      </div>
    </section>
  );
}
