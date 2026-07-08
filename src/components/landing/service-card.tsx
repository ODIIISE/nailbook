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
      className="p-4 cursor-pointer transition-all duration-180 hover:shadow-elevated active:scale-[0.98]"
      onClick={() => onSelect(service)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(service)}
      aria-label={`${service.name} - ${toPersianDigits(service.duration_minutes)} دقیقه - ${toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان`}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-h3 text-foreground leading-tight">
            {service.name}
          </h3>
          {service.description && (
            <p className="mt-1 text-[13px] text-muted-foreground line-clamp-1">
              {service.description}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
            </div>
            <span className="text-[15px] font-bold text-primary">
              {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/40 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}
