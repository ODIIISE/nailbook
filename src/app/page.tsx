"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import type { Highlight } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
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
          src="/hero-bg.webp"
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

      {/* Services Preview — horizontal scroll */}
      {services.filter((s) => s.is_active).length > 0 && (
        <div className="px-4 py-4">
          <div className="mx-auto max-w-lg">
            <h2 className="text-h3 text-foreground mb-3">خدمات ما</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {services
                .filter((s) => s.is_active)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((service, i) => (
                  <button
                    key={service.id}
                    onClick={() => router.push(`/book?service=${service.id}`)}
                    className="flex-shrink-0 w-[140px] glass rounded-2xl p-3 text-right active:scale-95 transition-all"
                  >
                    <div className={`w-full h-16 rounded-xl bg-gradient-to-br ${["from-rose-200 to-pink-300", "from-amber-200 to-orange-300", "from-emerald-200 to-teal-300", "from-blue-200 to-indigo-300", "from-purple-200 to-violet-300"][i % 5]} flex items-center justify-center mb-2`}>
                      <Sparkles className="h-5 w-5 text-white/80" />
                    </div>
                    <p className="text-[13px] font-bold text-foreground truncate">{service.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{toPersianDigits(service.duration_minutes)} دقیقه</p>
                    <p className="text-[12px] font-bold text-primary mt-1">{formatPrice(Number(service.price))} تومان</p>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

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
