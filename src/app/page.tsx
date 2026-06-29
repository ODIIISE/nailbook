"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hero } from "@/components/landing/hero";
import { NextAvailable } from "@/components/landing/next-available";
import { ServiceCard } from "@/components/landing/service-card";
import { TrustSignals } from "@/components/landing/trust-signals";
import { ContactButtons } from "@/components/landing/contact-buttons";
import { MOCK_TOTAL_BOOKINGS } from "@/lib/mock-data";
import { getNearestAvailableSlot } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import type { Service } from "@/lib/mock-data";

export default function HomePage() {
  const router = useRouter();
  const { salon, workingHours, services } = useSalon();
  const [nearestSlot, setNearestSlot] = useState<{ date: Date; time: string } | null>(null);

  useEffect(() => {
    const slot = getNearestAvailableSlot(
      workingHours,
      45,
      salon.slot_interval_minutes,
      salon.slot_buffer_minutes,
      [],
      []
    );
    setNearestSlot(slot);
  }, [workingHours, salon]);

  const handleSelectService = (service: Service) => {
    router.push(`/book?service=${service.id}`);
  };

  const handleBookNow = () => {
    router.push("/book");
  };

  return (
    <div className="min-h-screen bg-warm-white">
      <Hero salon={salon} />

      <NextAvailable
        date={nearestSlot?.date ?? null}
        time={nearestSlot?.time ?? null}
        onBookNow={handleBookNow}
      />

      <div className="px-4 mb-6">
        <div className="mx-auto max-w-lg">
          <h2 className="text-lg font-bold text-foreground mb-3">خدمات ما</h2>
          <div className="space-y-3">
            {services
              .filter((s) => s.is_active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  onSelect={handleSelectService}
                />
              ))}
          </div>
        </div>
      </div>

      <TrustSignals totalBookings={MOCK_TOTAL_BOOKINGS} />
      <ContactButtons phone={salon.phone} />

      <footer className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          ساخته شده با ❤️ برای ناخن‌های سوفی
        </p>
      </footer>
    </div>
  );
}
