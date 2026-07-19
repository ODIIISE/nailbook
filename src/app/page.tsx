"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Hero } from "@/components/landing/hero";
import { TrustSignals } from "@/components/landing/trust-signals";
import { ContactButtons } from "@/components/landing/contact-buttons";
import { Highlights } from "@/components/landing/highlights";
import { HighlightViewer } from "@/components/landing/highlight-viewer";
import { ServiceCardGrid } from "@/components/landing/service-card-grid";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Heart, Sparkles } from "lucide-react";
import { formatPrice, toPersianDigits } from "@/lib/jalali";

import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";
import type { Highlight } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, bookings, highlights, services } = useSalon();
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);

  // Show welcome toast on login/signup
  useEffect(() => {
    const welcome = searchParams.get("welcome");
    if (welcome === "1") {
      const name = searchParams.get("name");
      toast.success(name ? `خوش آمدید ${name}` : "خوش آمدید", {
        description: searchParams.get("name") ? "حساب شما با موفقیت ساخته شد" : "ورود شما با موفقیت انجام شد",
        duration: 3000,
      });
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  const scrollToServices = () => {
    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <SalonGuard>
    <div className="relative min-h-screen">

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

      <TrustSignals totalBookings={bookings.length} />

      <ContactButtons phone={salon.phone} />

      <footer className="px-4 py-6 text-center pb-20">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          Made with <Heart className="h-3 w-3 text-[#e74c3c] fill-[#e74c3c]" /> for Forehand Nail Studio
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
