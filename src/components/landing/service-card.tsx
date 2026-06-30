"use client";

import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/mock-data";

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <Card
      className="p-5 cursor-pointer transition-all hover:shadow-md hover:border-rose/30 active:scale-[0.98]"
      onClick={() => onSelect(service)}
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground leading-tight">
            {service.name}
          </h3>
          <p className="mt-1 text-[15px] text-muted-foreground leading-relaxed">
            {service.description}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-[13px] text-muted-foreground">
              {toPersianDigits(service.duration_minutes)} دقیقه
            </span>
            <span className="text-base font-bold text-rose">
              {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
        </div>
        <ChevronLeft className="h-5 w-5 shrink-0 text-muted-foreground/40" />
      </div>
    </Card>
  );
}
