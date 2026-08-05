"use client";

import { useState } from "react";
import { Clock3, MapPin, Sparkles } from "lucide-react";
import Image from "next/image";
import type { SalonInfo } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";
interface HeroProps {
  salon: SalonInfo;
  workingHours: WorkingHours;
}

function parseMinutes(value: string): number | null {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function getTehranScheduleNow(): { weekdayKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayKey = ({ Sat: "sat", Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri" } as Record<string, string>)[value("weekday")] ?? "sat";
  return { weekdayKey, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

function getLiveStatus(workingHours: WorkingHours): { open: boolean; label: string } {
  const now = getTehranScheduleNow();
  const today = workingHours[now.weekdayKey];
  if (!today) return { open: false, label: "امروز · تعطیل" };

  const openAt = parseMinutes(today.open);
  const closeAt = parseMinutes(today.close);
  if (openAt === null || closeAt === null) return { open: false, label: "ساعات کاری ثبت نشده" };
  if (now.minutes >= openAt && now.minutes < closeAt) return { open: true, label: `باز است · تا ${today.close}` };
  if (now.minutes < openAt) return { open: false, label: `بازگشایی ساعت ${today.open}` };
  return { open: false, label: "امروز · بسته" };
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
    <section className="qwen-hero" aria-labelledby="salon-hero-title">
      <div className="qwen-hero-bg" aria-hidden="true">
        {heroAvailable ? (
          <Image
            src={salon.hero_image_url!}
            alt=""
            fill
            priority
            unoptimized
            sizes="(max-width: 430px) 100vw, 430px"
            className="qwen-hero-bg-image object-cover"
            onError={() => setFailedHeroUrl(salon.hero_image_url)}
          />
        ) : (
          <div className="qwen-hero-fallback h-full w-full" />
        )}
        <div className="qwen-hero-fade" />
      </div>

      <div className="qwen-profile" dir="rtl">
        <div className="qwen-portrait-ring">
          {logoAvailable ? (
            <Image
              src={salon.logo_url!}
              alt={`لوگوی ${salon.name}`}
              width={112}
              height={112}
              unoptimized
              className="qwen-portrait"
              onError={() => setFailedLogoUrl(salon.logo_url)}
            />
          ) : (
            <div className="qwen-portrait-fallback" aria-hidden="true"><Sparkles className="h-9 w-9" /></div>
          )}
        </div>

        <p className="qwen-brand-kicker">استودیو تخصصی ناخن</p>
        <h1 id="salon-hero-title" className="qwen-salon-name">{salon.name}</h1>
        {salon.slogan ? <p className="qwen-salon-slogan">{salon.slogan}</p> : null}

        <div className="qwen-hero-meta">
          {salon.address ? (
            <a
              href={mapUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="qwen-location"
              aria-label={`باز کردن آدرس ${salon.address} در نقشه`}
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{salon.address}</span>
            </a>
          ) : null}
          <div className="qwen-open-row" aria-live="polite">
            <span className={`qwen-status-dot ${liveStatus.open ? "is-open" : "is-closed"}`} aria-hidden="true" />
            <Clock3 className="h-4 w-4" aria-hidden="true" />
            <span>{liveStatus.label}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
