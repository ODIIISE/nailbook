"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, Clock3, Sparkles } from "lucide-react";
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
  return services.filter((service) => service.is_active).sort((a, b) => a.sort_order - b.sort_order);
}

function ServiceOption({ service, onSelect }: { service: Service; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="group flex min-h-[76px] w-full items-center gap-3 rounded-[var(--radius-booking-item)] border border-border bg-card p-3 text-right transition-[background-color,border-color,transform,box-shadow] duration-200 hover:border-foreground/30 hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label={`شروع رزرو ${service.name}`}>
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-booking-icon)] bg-muted">
        <ServiceImage service={service} sizes="48px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-bold text-foreground">{service.name}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden="true" />{toPersianDigits(service.duration_minutes)} دقیقه</span>
          <span>{formatPrice(Number(service.price))} تومان</span>
        </span>
      </span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

function ServiceSelectionSheet({ open, services, isLoading, onClose }: BookingCtaProps & { open: boolean; onClose: () => void }) {
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-booking-icon)] bg-foreground text-background"><CalendarDays className="h-4 w-4" aria-hidden="true" /></div>
          <div><p className="text-caption font-bold text-foreground">از کجا شروع کنیم؟</p><p className="mt-0.5 text-small leading-6 text-muted-foreground">خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p></div>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[var(--radius-booking-item)] border border-border p-5 text-small text-muted-foreground" role="status" aria-busy="true"><span className="loading-dot" aria-hidden="true" /><span>در حال آماده‌سازی خدمات...</span></div>
        ) : activeServices.length > 0 ? (
          <div className="space-y-2" role="list" aria-label="خدمات قابل رزرو">{activeServices.map((service) => <div key={service.id} role="listitem"><ServiceOption service={service} onSelect={() => handleSelect(service.id)} /></div>)}</div>
        ) : (
          <div className="rounded-[var(--radius-booking-item)] border border-dashed border-border p-6 text-center"><Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" /><p className="text-caption font-bold text-foreground">هنوز خدمتی برای رزرو فعال نیست</p><p className="mt-1 text-small text-muted-foreground">لطفاً بعداً دوباره سر بزنید.</p></div>
        )}
      </div>
    </BottomSheet>
  );
}

export function BookingCta({ services, isLoading }: BookingCtaProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <section id="booking-cta" className="px-5 pb-5 pt-3" aria-labelledby="booking-cta-title">
        <div className="mx-auto max-w-lg" dir="rtl">
          <button type="button" onClick={() => setSheetOpen(true)} className="booking-cta-action group relative flex min-h-[62px] w-full items-center justify-center gap-2 rounded-[16px] bg-foreground px-5 text-center text-background shadow-floating transition-[background-color,box-shadow,transform] duration-200 hover:bg-foreground/90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-haspopup="dialog" aria-expanded={sheetOpen}>
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            <span id="booking-cta-title" className="text-body font-extrabold">شروع رزرو</span>
            <ChevronLeft className="absolute left-5 h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">بدون تماس تلفنی · زمان‌های آزاد همین‌جا</p>
        </div>
      </section>
      <ServiceSelectionSheet open={sheetOpen} services={services} isLoading={isLoading} onClose={() => setSheetOpen(false)} />
    </>
  );
}
