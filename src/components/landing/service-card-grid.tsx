"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Clock, ChevronLeft, Sparkles } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/types";
import { ServiceImage } from "@/components/ui/service-image";

interface ServiceCardGridProps {
  services: Service[];
  isLoading?: boolean;
}

function ServiceCard({ service, onSelect }: { service: Service; onSelect: () => void }) {
  return (
    <Card
      className="qwen-service-card group"
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
      <div className="qwen-service-image">
        <ServiceImage service={service} alt={service.name} sizes="54px" className="object-cover transition-transform duration-300 group-hover:scale-105" />
      </div>
      <div className="qwen-service-copy">
        <h3>{service.name}</h3>
        <p>{service.description || "خدمت تخصصی ناخن"}</p>
        <div className="qwen-service-meta">
          <span>{formatPrice(Number(service.price))} تومان</span>
          <span><Clock className="h-3.5 w-3.5" aria-hidden="true" />{toPersianDigits(service.duration_minutes)} دقیقه</span>
        </div>
      </div>
      <ChevronLeft className="qwen-service-chevron h-5 w-5" aria-hidden="true" />
    </Card>
  );
}

export function ServiceCardGrid({ services, isLoading }: ServiceCardGridProps) {
  const router = useRouter();
  const activeServices = services.filter((service) => service.is_active).sort((a, b) => a.sort_order - b.sort_order);

  if (isLoading) {
    return <div className="qwen-services" role="status"><div className="qwen-service-loading"><span className="loading-dot" aria-hidden="true" />در حال آماده‌سازی خدمات...</div></div>;
  }

  if (activeServices.length === 0) {
    return <div className="qwen-service-empty"><Sparkles className="mx-auto mb-2 h-7 w-7" aria-hidden="true" /><p>هنوز خدماتی برای رزرو فعال نیست</p></div>;
  }

  return (
    <section className="qwen-services" aria-labelledby="services-heading">
      <div className="qwen-section-heading" dir="rtl">
        <div><p className="qwen-section-kicker">انتخاب تو</p><h2 id="services-heading">خدمات ما</h2></div>
      </div>
      <div className="qwen-service-list">
        {activeServices.map((service) => <ServiceCard key={service.id} service={service} onSelect={() => router.push(`/book?service=${service.id}`)} />)}
      </div>
    </section>
  );
}
