"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Hero } from "@/components/landing/hero";
import { NextAvailable } from "@/components/landing/next-available";
import { TrustSignals } from "@/components/landing/trust-signals";
import { ContactButtons } from "@/components/landing/contact-buttons";
import { Highlights } from "@/components/landing/highlights";
import { HighlightViewer } from "@/components/landing/highlight-viewer";
import { ServiceCardGrid } from "@/components/landing/service-card-grid";
import { Heart } from "lucide-react";

import { getNearestAvailableSlot } from "@/lib/slots";
import { useSalon } from "@/lib/salon-context";
import type { Highlight } from "@/lib/mock-data";

export default function HomePage() {
  const router = useRouter();
  const { salon, workingHours, bookings, highlights, services } = useSalon();
  const [nearestSlot, setNearestSlot] = useState<{ date: Date; time: string } | null>(null);
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);

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

  const handleBookNow = () => {
    router.push("/book");
  };

  return (
    <div className="min-h-screen">
      <Header />

      <Highlights
        highlights={highlights}
        onSelect={setViewingHighlight}
      />

      <ServiceCardGrid services={services} />

      <Hero salon={salon} onBookNow={handleBookNow} />

      <NextAvailable
        date={nearestSlot?.date ?? null}
        time={nearestSlot?.time ?? null}
        onBookNow={handleBookNow}
      />

      <TrustSignals totalBookings={bookings.length || 527} />

      <ContactButtons phone={salon.phone} />

      <footer className="px-4 py-6 text-center pb-20">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          ساخته شده با <Heart className="h-3 w-3 text-rose fill-rose" /> برای Forehand Nail Studio
        </p>
      </footer>

      <CustomerNav />

      {viewingHighlight && (
        <HighlightViewer
          highlight={viewingHighlight}
          onClose={() => setViewingHighlight(null)}
        />
      )}
    </div>
  );
}
