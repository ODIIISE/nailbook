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

  const handleSelect = (serviceId: string) => { setPendingServiceId(serviceId); onClose(); };
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
      <section id="booking-cta" className="scroll-mt-20 px-4 py-6" aria-labelledby="booking-cta-title" aria-describedby="booking-cta-description">
        <div className="booking-invitation relative mx-auto max-w-lg overflow-hidden rounded-[28px] p-5 shadow-elevated sm:p-6" dir="rtl">
          <div className="pointer-events-none absolute -left-10 -top-16 h-40 w-40 rounded-full border border-[color:var(--home-accent)]/30" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-16 -right-8 h-44 w-44 rounded-full border border-[color:var(--home-accent)]/20" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <p className="text-small font-bold tracking-wide text-[color:var(--home-accent-strong)]">قرار بعدی تو</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--home-accent)]/10 text-[color:var(--home-accent-strong)]" aria-hidden="true"><CalendarDays className="h-4 w-4" /></span>
            </div>
            <h2 id="booking-cta-title" className="mt-3 text-[24px] font-extrabold leading-[1.45] tracking-[-0.025em] text-foreground sm:text-[27px]">وقتت را برای زیبایی رزرو کن</h2>
            <p id="booking-cta-description" className="mt-2 max-w-md text-caption leading-6 text-muted-foreground">چند دقیقه برای خودت؛ یک انتخاب زیبا برای روزهای بعد.</p>
            <div className="mt-5 flex items-center gap-3 border-t border-[color:var(--home-border-strong)]/70 pt-4">
              <button type="button" onClick={() => setSheetOpen(true)} className="booking-cta-action group flex min-h-[48px] flex-1 items-center justify-between rounded-[var(--radius-booking-item)] bg-foreground px-4 text-body font-bold text-background shadow-xs transition-[background-color,box-shadow,transform] duration-200 hover:bg-foreground/85 hover:shadow-elevated active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-haspopup="dialog" aria-expanded={sheetOpen}>
                <span>شروع رزرو</span><span className="booking-cta-arrow flex h-7 w-7 items-center justify-center rounded-full bg-background/10 transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true"><ChevronLeft className="h-4 w-4" /></span>
              </button>
              <span className="hidden text-[10px] font-medium leading-5 text-muted-foreground sm:block">انتخاب خدمت<br />زمان مناسب</span>
            </div>
          </div>
        </div>
      </section>
      <ServiceSelectionSheet open={sheetOpen} services={services} isLoading={isLoading} onClose={() => setSheetOpen(false)} />
    </>
  );
}
