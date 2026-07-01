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
      className="p-4 cursor-pointer transition-all duration-150 hover:bg-muted active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50"
      onClick={() => onSelect(service)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(service)}
      aria-label={`${service.name} - ${toPersianDigits(service.duration_minutes)} دقیقه - ${toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-bold text-foreground leading-tight">
            {service.name}
          </h3>
          <p className="mt-0.5 text-[15px] text-muted-foreground">
            {service.description}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1 text-[13px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
            </div>
            <span className="text-[15px] font-bold text-primary">
              {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
        </div>
        <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
    </Card>
  );
}
