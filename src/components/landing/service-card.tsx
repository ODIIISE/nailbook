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
      className="glass p-5 cursor-pointer transition-all duration-200 hover:scale-[0.98] active:scale-95 rounded-3xl"
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
          <p className="mt-1 text-[15px] text-muted-foreground">
            {service.description}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
            </div>
            <span className="text-[17px] font-bold text-foreground">
              {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/50">
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </div>
      </div>
    </Card>
  );
}
