"use client";

import { useState } from "react";
import { ArrowUpLeft, CalendarDays, ChevronLeft, Clock3, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/types";

interface BookingCtaProps {
  services: Service[];
  isLoading?: boolean;
}

export function sortActiveServices(services: Service[]): Service[] {
  return services
    .filter((service) => service.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

function ServiceOption({ service, onSelect }: { service: Service; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex min-h-[76px] w-full items-center gap-3 rounded-[var(--radius-booking-item)] border border-border bg-card p-3 text-right transition-[background-color,border-color,transform,box-shadow] duration-200 hover:border-foreground/30 hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      aria-label={`شروع رزرو ${service.name}`}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-booking-icon)] bg-muted">
        {service.image_url ? (
          <Image
            src={service.image_url}
            alt=""
            fill
            sizes="48px"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-bold text-foreground">{service.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {toPersianDigits(service.duration_minutes)} دقیقه
          </span>
          <span>{formatPrice(Number(service.price))} تومان</span>
        </span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

function ServiceSelectionSheet({
  open,
  services,
  isLoading,
  onClose,
}: BookingCtaProps & { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const activeServices = sortActiveServices(services);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);

  const handleSelect = (serviceId: string) => {
    setPendingServiceId(serviceId);
    onClose();
  };

  const handleClosed = () => {
    if (!pendingServiceId) return;
    const serviceId = pendingServiceId;
    setPendingServiceId(null);
    router.push(`/book?service=${serviceId}`);
  };

  return (
    <BottomSheet open={open} onClose={onClose} onClosed={handleClosed} title="انتخاب خدمت">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-[var(--radius-booking-item)] bg-muted/60 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-booking-icon)] bg-foreground text-background">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground">از کجا شروع کنیم؟</p>
            <p className="mt-0.5 text-[11px] leading-6 text-muted-foreground">خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2" aria-label="در حال بارگذاری خدمات" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex min-h-[76px] items-center gap-3 rounded-[var(--radius-booking-item)] border border-border p-3">
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-[var(--radius-booking-icon)] bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : activeServices.length > 0 ? (
          <div className="space-y-2" role="list" aria-label="خدمات قابل رزرو">
            {activeServices.map((service) => (
              <div key={service.id} role="listitem">
                <ServiceOption service={service} onSelect={() => handleSelect(service.id)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-booking-item)] border border-dashed border-border p-6 text-center">
            <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-[13px] font-bold text-foreground">هنوز خدمتی برای رزرو فعال نیست</p>
            <p className="mt-1 text-[11px] text-muted-foreground">لطفاً بعداً دوباره سر بزنید.</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export function BookingCta({ services, isLoading }: BookingCtaProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <section className="px-4 py-3" aria-labelledby="booking-cta-title">
        <div className="mx-auto max-w-lg rounded-[var(--radius-booking-cta)] border border-[var(--booking-cta-border)] bg-[var(--booking-cta-bg)] p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="booking-cta-title" className="text-[19px] font-extrabold leading-8 tracking-[-0.02em] text-foreground">
                وقتت را برای زیبایی رزرو کن
              </h2>
              <p className="mt-0.5 max-w-[280px] text-[12px] leading-6 text-muted-foreground">
                خدمتت را انتخاب کن و زمان‌های آزاد را ببین.
              </p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-booking-icon)] bg-foreground text-background" aria-hidden="true">
              <ArrowUpLeft className="h-4 w-4" />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mt-4 flex min-h-[48px] w-full items-center justify-between rounded-[var(--radius-booking-item)] bg-foreground px-4 text-[14px] font-bold text-background shadow-xs transition-[background-color,transform] duration-200 hover:bg-foreground/85 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <span>رزرو نوبت</span>
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </section>
      <ServiceSelectionSheet
        open={sheetOpen}
        services={services}
        isLoading={isLoading}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
