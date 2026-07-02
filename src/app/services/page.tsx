"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { ServiceCard } from "@/components/landing/service-card";
import { useSalon } from "@/lib/salon-context";
import type { Service } from "@/lib/mock-data";

export default function ServicesPage() {
  const router = useRouter();
  const { services } = useSalon();

  const handleSelectService = (service: Service) => {
    if (service.addon_ids.length > 0) {
      router.push(`/book?service=${service.id}&step=addon`);
    } else {
      router.push(`/book?service=${service.id}`);
    }
  };

  const activeServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen">
      <Header showBack title="خدمات ما" onBack={() => router.back()} />

      <div className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-4 animate-stagger">
          {activeServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={handleSelectService}
            />
          ))}
        </div>
      </div>

      <CustomerNav />
    </div>
  );
}
