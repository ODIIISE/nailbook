"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign, Sparkles, ChevronLeft, CalendarCheck } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/types";
import { ServiceImage } from "@/components/ui/service-image";

interface ServiceCardGridProps {
  services: Service[];
  isLoading?: boolean;
}

function ServiceCard({
  service,
  onSelect,
}: {
  service: Service;
  onSelect: () => void;
}) {
  return (
    <Card
      className="group cursor-pointer overflow-hidden border border-border bg-card transition-all duration-200 hover:shadow-elevated active:scale-[0.99]"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`رزرو ${service.name}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          <ServiceImage
            service={service}
            alt={service.name}
            sizes="64px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-body font-bold text-foreground transition-colors group-hover:text-primary">
            {service.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-caption text-muted-foreground">
            {service.description || "بدون توضیحات"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-small font-medium text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {toPersianDigits(service.duration_minutes)} دقیقه
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-2 py-0.5 text-small font-bold text-primary">
              <DollarSign className="h-3 w-3" aria-hidden="true" />
              {formatPrice(Number(service.price))} تومان
            </span>
          </div>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>
    </Card>
  );
}

export function ServiceCardGrid({ services, isLoading }: ServiceCardGridProps) {
  const router = useRouter();
  const activeServices = services
    .filter((service) => service.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (isLoading) {
    return (
      <div className="px-4 py-6" role="status" aria-label="در حال بارگذاری خدمات">
        <div className="mx-auto flex max-w-lg items-center justify-center gap-3 rounded-2xl border border-border p-5 text-small text-muted-foreground">
          <span className="loading-dot" aria-hidden="true" />
          <span>در حال آماده‌سازی خدمات...</span>
        </div>
      </div>
    );
  }

  if (activeServices.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
        <p className="text-caption text-muted-foreground">هنوز خدماتی اضافه نشده</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-h2 text-foreground">خدمات ما</h2>
        </div>
        <div className="space-y-3">
          {activeServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={() => router.push(`/book?service=${service.id}`)}
            />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-small text-muted-foreground">
          <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>رزرو آنی و بدون تماس تلفنی</span>
        </div>
      </div>
    </div>
  );
}
