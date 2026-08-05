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
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius-booking-icon)] bg-muted"><ServiceImage service={service} sizes="48px" className="object-cover transition-transform duration-300 group-hover:scale-105" /></div>
      <span className="min-w-0 flex-1"><span className="block truncate text-body font-bold text-foreground">{service.name}</span><span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden="true" />{toPersianDigits(service.duration_minutes)} دقیقه</span><span>{formatPrice(Number(service.price))} تومان</span></span></span>
      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

function ServiceSelectionSheet({ open, services, isLoading, onClose }: BookingCtaProps & { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const activeServices = sortActiveServices(services);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const handleSelect = (serviceId: string) => { setPendingServiceId(serviceId); onClose(); };
  const handleClosed = () => { if (!pendingServiceId) return; const serviceId = pendingServiceId; setPendingServiceId(null); router.push(`/book?service=${serviceId}`); };

  return (
    <BottomSheet open={open} onClose={onClose} onClosed={handleClosed} title="انتخاب خدمت">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-[var(--radius-booking-item)] bg-muted/60 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-booking-icon)] bg-foreground text-background"><CalendarDays className="h-4 w-4" aria-hidden="true" /></div><div><p className="text-caption font-bold text-foreground">از کجا شروع کنیم؟</p><p className="mt-0.5 text-small leading-6 text-muted-foreground">خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p></div></div>
        {isLoading ? <div className="flex items-center justify-center gap-3 rounded-[var(--radius-booking-item)] border border-border p-5 text-small text-muted-foreground" role="status" aria-busy="true"><span className="loading-dot" aria-hidden="true" />در حال آماده‌سازی خدمات...</div> : activeServices.length > 0 ? <div className="space-y-2" role="list" aria-label="خدمات قابل رزرو">{activeServices.map((service) => <div key={service.id} role="listitem"><ServiceOption service={service} onSelect={() => handleSelect(service.id)} /></div>)}</div> : <div className="rounded-[var(--radius-booking-item)] border border-dashed border-border p-6 text-center"><Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden="true" /><p className="text-caption font-bold text-foreground">هنوز خدمتی برای رزرو فعال نیست</p><p className="mt-1 text-small text-muted-foreground">لطفاً بعداً دوباره سر بزنید.</p></div>}
      </div>
    </BottomSheet>
  );
}

export function BookingCta({ services, isLoading }: BookingCtaProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeServices = sortActiveServices(services);
  const isUnavailable = !isLoading && activeServices.length === 0;
  return (
    <>
      <section id="booking-cta" className="qwen-booking-area" aria-labelledby="booking-cta-title">
        <div className="qwen-booking-card" dir="rtl">
          <button type="button" onClick={() => !isUnavailable && setSheetOpen(true)} className="qwen-booking-button group" aria-haspopup="dialog" aria-expanded={sheetOpen} disabled={isUnavailable} aria-disabled={isUnavailable}>
            <span className="qwen-booking-copy"><strong id="booking-cta-title">{isUnavailable ? "رزرو موقتاً بسته است" : "رزرو نوبت"}</strong><small>{isUnavailable ? "در حال حاضر خدمتی برای رزرو فعال نیست" : "انتخاب خدمت و زمان دلخواه"}</small></span>
            <CalendarDays className="h-6 w-6 shrink-0" aria-hidden="true" />
            <ChevronLeft className="qwen-booking-arrow h-6 w-6 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          </button>
        </div>
        <p className="qwen-booking-note">خدمت موردنظرت را انتخاب کن؛ <b>زمان‌های آزاد</b> همین‌جا نمایش داده می‌شوند.</p>
      </section>
      <ServiceSelectionSheet open={sheetOpen} services={services} isLoading={isLoading} onClose={() => setSheetOpen(false)} />
    </>
  );
}
