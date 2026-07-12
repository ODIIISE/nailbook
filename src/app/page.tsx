"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Hero } from "@/components/landing/hero";
import { TrustSignals } from "@/components/landing/trust-signals";
import { ContactButtons } from "@/components/landing/contact-buttons";
import { Highlights } from "@/components/landing/highlights";
import { HighlightViewer } from "@/components/landing/highlight-viewer";
import { ServiceCardGrid } from "@/components/landing/service-card-grid";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Heart } from "lucide-react";

import { useSalon } from "@/lib/salon-context";
import type { Highlight } from "@/lib/types";

export default function HomePage() {
  const { salon, bookings, highlights, services } = useSalon();
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);

  const scrollToServices = () => {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <SalonGuard>
    <div className="relative min-h-screen">
      {/* Hero background image */}
      <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none">
        <img
          src="/hero-bg.png"
          alt=""
          className="w-full object-cover object-top opacity-80"
          style={{
            maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <AppHeader />

      <Highlights
        highlights={highlights}
        onSelect={setViewingHighlight}
      />

      <Hero salon={salon} onBookNow={scrollToServices} />

      <div id="services">
        <ServiceCardGrid services={services} />
      </div>

      <TrustSignals totalBookings={bookings.length || 527} />

      <ContactButtons phone={salon.phone} />

      <footer className="px-4 py-6 text-center pb-20">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          ساخته شده با <Heart className="h-3 w-3 text-rose fill-rose" /> برای Forehand Nail Studio
        </p>
      </footer>

      <AppNavbar />

      {viewingHighlight && (
        <HighlightViewer
          highlight={viewingHighlight}
          onClose={() => setViewingHighlight(null)}
        />
      )}
      </div>
    </div>
    </SalonGuard>
  );
}
