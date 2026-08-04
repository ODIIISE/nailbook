"use client";

import { useState } from "react";
import { ArrowUpLeft, CalendarDays, ChevronLeft, Clock3, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/types";
import { ServiceImage } from "@/components/ui/service-image";

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
        <ServiceImage
          service={service}
          sizes="48px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-bold text-foreground">{service.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-muted-foreground">
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
            <p className="text-caption font-bold text-foreground">از کجا شروع کنیم؟</p>
            <p className="mt-0.5 text-small leading-6 text-muted-foreground">خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[var(--radius-booking-item)] border border-border p-5 text-small text-muted-foreground" role="status" aria-busy="true">
            <span className="loading-dot" aria-hidden="true" />
            <span>در حال آماده‌سازی خدمات...</span>
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
            <p className="text-caption font-bold text-foreground">هنوز خدمتی برای رزرو فعال نیست</p>
            <p className="mt-1 text-small text-muted-foreground">لطفاً بعداً دوباره سر بزنید.</p>
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
      <section className="px-4 py-5" aria-labelledby="booking-cta-title" aria-describedby="booking-cta-description">
        <div className="surface-lift relative mx-auto max-w-lg overflow-hidden rounded-[22px] border border-foreground/10 bg-card shadow-card">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" aria-hidden="true" />

          <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[112px_minmax(0,1fr)] sm:gap-5 sm:p-5" dir="ltr">
            <div className="relative min-h-[208px] overflow-hidden rounded-[18px] bg-foreground text-background shadow-elevated" aria-hidden="true">
              <div className="absolute -left-10 -top-8 h-28 w-28 rounded-full border border-background/20" />
              <div className="absolute -bottom-12 -right-10 h-36 w-36 rounded-full border border-background/15" />
              <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,transparent_0%,transparent_47%,color-mix(in_oklab,var(--background)_35%,transparent)_48%,transparent_49%,transparent_100%)] [background-size:18px_18px]" />
              <div className="relative flex h-full flex-col items-center justify-between p-3 sm:p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-[13px] border border-background/30 bg-background/10">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <span className="h-px w-8 bg-background/50" />
                  <span className="text-[10px] font-bold tracking-[0.18em] text-background/75 [writing-mode:vertical-rl]">FOREHAND</span>
                </div>
                <ArrowUpLeft className="h-5 w-5 self-start text-background/70" />
              </div>
            </div>

            <div className="flex min-w-0 flex-col text-right" dir="rtl">
              <div className="flex items-center gap-2 text-small font-bold tracking-wide text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden="true" />
                رزرو آنلاین
              </div>
              <h2 id="booking-cta-title" className="mt-3 text-[21px] font-extrabold leading-[1.55] tracking-[-0.025em] text-foreground sm:text-[23px]">
                وقتت را برای زیبایی رزرو کن
              </h2>
              <p id="booking-cta-description" className="mt-2 max-w-[260px] text-caption leading-6 text-muted-foreground">
                خدمتت را انتخاب کن و زمان مناسب خودت را در چند قدم پیدا کن.
              </p>

              <div className="mt-auto pt-5">
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="booking-cta-action group flex min-h-[52px] w-full items-center justify-between rounded-[var(--radius-booking-item)] bg-foreground px-4 text-body font-bold text-background shadow-xs transition-[background-color,box-shadow,transform] duration-200 hover:bg-foreground/85 hover:shadow-elevated active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  aria-haspopup="dialog"
                  aria-expanded={sheetOpen}
                >
                  <span>رزرو نوبت</span>
                  <span className="booking-cta-arrow flex h-7 w-7 items-center justify-center rounded-full bg-background/10 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                </button>
                <p className="mt-2 text-center text-[10px] font-medium text-muted-foreground">
                  انتخاب خدمت <span className="mx-1 text-border">•</span> زمان آزاد <span className="mx-1 text-border">•</span> تأیید نهایی
                </p>
              </div>
            </div>
          </div>
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
