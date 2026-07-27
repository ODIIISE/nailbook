"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, DollarSign, Sparkles, ChevronLeft, CalendarCheck } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/types";

interface ServiceCardGridProps {
  services: Service[];
  isLoading?: boolean;
}

const PLACEHOLDER_GRADIENTS = [
  "from-rose-300 to-pink-400",
  "from-amber-300 to-orange-400",
  "from-emerald-300 to-teal-400",
  "from-blue-300 to-indigo-400",
  "from-purple-300 to-violet-400",
  "from-cyan-300 to-sky-400",
];

function ServiceCardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-3 overflow-hidden">
          <div className="flex items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex items-center gap-2 pt-0.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ServiceCardGrid({ services, isLoading }: ServiceCardGridProps) {
  const router = useRouter();

  const activeServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (isLoading || services.length === 0) {
    return (
      <div className="px-4 py-6">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-h2 text-foreground">خدمات ما</h2>
          </div>
          <ServiceCardSkeleton />
        </div>
      </div>
    );
  }

  if (activeServices.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-caption text-muted-foreground">هنوز خدماتی اضافه نشده</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-h2 text-foreground">خدمات ما</h2>
        </div>
        <div className="space-y-3">
          {activeServices.map((service, index) => (
            <Card
              key={service.id}
              className="group overflow-hidden cursor-pointer border border-border bg-card hover:shadow-elevated transition-all duration-200 active:scale-[0.99]"
              onClick={() => router.push(`/book?service=${service.id}`)}
              role="button"
              tabIndex={0}
              aria-label={`رزرو ${service.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/book?service=${service.id}`);
                }
              }}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Thumbnail */}
                <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 bg-muted">
                  {service.image_url ? (
                    <Image
                      src={service.image_url}
                      alt={service.name}
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length]} flex items-center justify-center`}
                    >
                      <Sparkles className="h-6 w-6 text-white/80" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-body font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-caption text-muted-foreground mt-0.5 line-clamp-1">
                    {service.description || "بدون توضیحات"}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                      <Clock className="h-3 w-3" />
                      {toPersianDigits(service.duration_minutes)} دقیقه
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                      <DollarSign className="h-3 w-3" />
                      {formatPrice(Number(service.price))} تومان
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Trust microcopy */}
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-muted-foreground">
          <CalendarCheck className="h-3.5 w-3.5" />
          <span>رزرو آنی و بدون تماس تلفنی</span>
        </div>
      </div>
    </div>
  );
}
