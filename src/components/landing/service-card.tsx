"use client";

import { Card } from "@/components/ui/card";
import { ChevronLeft, Clock } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/mock-data";

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <Card
      className="p-5 rounded-2xl cursor-pointer transition-all duration-150 hover:shadow-[var(--shadow-elevated)] hover:border-primary/20 active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-primary/50"
      onClick={() => onSelect(service)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(service)}
      aria-label={`${service.name} - ${toPersianDigits(service.duration_minutes)} دقیقه - ${toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-h3 text-foreground leading-tight">
            {service.name}
          </h3>
          <p className="mt-1 text-body text-muted-foreground leading-relaxed">
            {service.description}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
            </div>
            <span className="text-body font-bold text-primary">
              {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
          <ChevronLeft className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}
