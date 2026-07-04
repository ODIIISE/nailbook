"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/mock-data";

interface ServiceCardGridProps {
  services: Service[];
}

export function ServiceCardGrid({ services }: ServiceCardGridProps) {
  const router = useRouter();
  const activeServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="px-4 py-6">
      <h2 className="text-h2 text-foreground mb-4">خدمات ما</h2>
      <div className="space-y-3">
        {activeServices.map((service) => (
          <Card
            key={service.id}
            className="p-4 cursor-pointer hover:shadow-elevated transition-shadow"
            onClick={() => router.push(`/book?service=${service.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-body-lg font-bold text-foreground">
                  {service.name}
                </h3>
                <p className="text-caption text-muted-foreground mt-1">
                  {service.description}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-small text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
                  </div>
                  <div className="flex items-center gap-1 text-small font-bold text-primary">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
