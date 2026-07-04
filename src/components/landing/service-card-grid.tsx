"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign, Sparkles } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/mock-data";

interface ServiceCardGridProps {
  services: Service[];
}

// Placeholder colors for service cards
const PLACEHOLDER_COLORS = [
  "from-rose-200 to-pink-300",
  "from-amber-200 to-orange-300",
  "from-emerald-200 to-teal-300",
  "from-blue-200 to-indigo-300",
  "from-purple-200 to-violet-300",
];

export function ServiceCardGrid({ services }: ServiceCardGridProps) {
  const router = useRouter();
  const activeServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="px-4 py-6">
      <h2 className="text-h2 text-foreground mb-4">خدمات ما</h2>
      <div className="space-y-3">
        {activeServices.map((service, index) => (
          <Card
            key={service.id}
            className="p-4 cursor-pointer hover:shadow-elevated transition-shadow overflow-hidden"
            onClick={() => router.push(`/book?service=${service.id}`)}
          >
            <div className="flex gap-4">
              {/* Placeholder Image */}
              <div
                className={`w-20 h-20 rounded-xl bg-gradient-to-br ${PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]} flex items-center justify-center flex-shrink-0`}
              >
                <Sparkles className="h-8 w-8 text-white/80" />
              </div>

              {/* Service Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-body-lg font-bold text-foreground truncate">
                  {service.name}
                </h3>
                <p className="text-caption text-muted-foreground mt-1 line-clamp-2">
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
