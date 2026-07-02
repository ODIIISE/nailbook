"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Hero } from "@/components/landing/hero";
import { NextAvailable } from "@/components/landing/next-available";
import { ServiceCard } from "@/components/landing/service-card";
import { TrustSignals } from "@/components/landing/trust-signals";
import { ContactButtons } from "@/components/landing/contact-buttons";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

import { getNearestAvailableSlot } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import type { Service } from "@/lib/mock-data";

export default function HomePage() {
  const router = useRouter();
  const { salon, workingHours, services, bookings } = useSalon();
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
    if (service.addon_ids.length > 0) {
      router.push(`/book?service=${service.id}&step=addon`);
    } else {
      router.push(`/book?service=${service.id}`);
    }
  };

  const handleBookNow = () => {
    router.push("/book");
  };

  return (
    <div className="min-h-screen">
      <Header />

      <Hero salon={salon} onBookNow={handleBookNow} />

      <NextAvailable
        date={nearestSlot?.date ?? null}
        time={nearestSlot?.time ?? null}
        onBookNow={handleBookNow}
      />

      <TrustSignals totalBookings={bookings.length || 527} />

      <div className="px-4 mb-6">
        <div className="mx-auto max-w-lg">
          <h2 className="text-lg font-bold text-foreground mb-4">خدمات ما</h2>
          <div className="space-y-4 animate-stagger">
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

      <ContactButtons phone={salon.phone} />

      <footer className="px-4 py-6 text-center pb-20">
        <p className="text-xs text-muted-foreground">
          ساخته شده با ❤️ برای Forehand Nail Studio
        </p>
      </footer>

      <CustomerNav />
    </div>
  );
}
