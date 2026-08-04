"use client";

import Image from "next/image";
import { Sparkles, Users } from "lucide-react";
import type { Service } from "@/lib/types";
import { formatPrice, toPersianDigits } from "@/lib/jalali";

interface Props {
  service: Service;
  popularLast30Days: number;
}

/**
 * Hero block for the "service detail" step that precedes addon selection.
 * Pure presentation: derives signals from `service` and the booking count.
 */
export function ServiceDetail({ service, popularLast30Days }: Props) {
  const hasImage = Boolean(service.image_url && service.image_url.length > 0);
  const bestFor = Array.isArray(service.best_for) ? service.best_for.filter(Boolean) : [];
  const description = typeof service.description === "string" ? service.description.trim() : "";

  return (
    <div className="space-y-3">
      {hasImage ? (
        <div className="relative w-full aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted">
          <Image
            src={service.image_url as string}
            alt={service.name}
            fill
            sizes="(max-width: 430px) 100vw, 430px"
            className="object-cover"
            unoptimized
            priority
          />
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <h1 className="text-h2 font-extrabold text-white leading-tight">{service.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-caption text-white/80">
              <span dir="ltr">{formatPrice(Number(service.price))} تومان</span>
              <span>·</span>
              <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl border border-border bg-card">
          <h1 className="text-h2 font-extrabold text-foreground leading-tight">{service.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-caption text-muted-foreground">
            <span dir="ltr">{formatPrice(Number(service.price))} تومان</span>
            <span>·</span>
            <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
          </div>
        </div>
      )}

      {description && (
        <p className="text-caption leading-7 text-muted-foreground px-1">{description}</p>
      )}

      {popularLast30Days > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10">
          <Users className="h-3.5 w-3.5 text-primary" />
          <p className="text-caption text-foreground">
            <span className="font-bold text-primary">{toPersianDigits(popularLast30Days)} نفر</span>
            {" "}این خدمت را در ۳۰ روز گذشته رزرو کرده‌اند
          </p>
        </div>
      )}

      {bestFor.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Sparkles className="h-3.5 w-3.5 text-foreground" />
            <span className="text-caption font-bold text-foreground">این خدمت برای چه کسانی مناسب است؟</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bestFor.map((tag, idx) => (
              <span
                key={`${tag}-${idx}`}
                className="px-3 py-1 rounded-full bg-card border border-border text-small text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
