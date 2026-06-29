"use client";

import { Card } from "@/components/ui/card";
import { toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/mock-data";

interface ServiceCardProps {
  service: Service;
  onSelect: (service: Service) => void;
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <Card
      className="p-4 cursor-pointer transition-all hover:shadow-md hover:border-rose/30 active:scale-[0.98]"
      onClick={() => onSelect(service)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{service.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {service.description}
          </p>
          <div className="mt-2 flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {toPersianDigits(service.duration_minutes)} دقیقه
            </span>
            <span className="text-rose font-bold">
              {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
            </span>
          </div>
        </div>
        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose" />
      </div>
    </Card>
  );
}
