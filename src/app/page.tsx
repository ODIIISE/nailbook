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
import { Heart, Shield, Store, Users, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice, toPersianDigits } from "@/lib/jalali";

import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";
import type { Highlight } from "@/lib/types";

// Admin landing page (when SALON_ID is not set) — Dark minimal design
function AdminLanding() {
  const router = useRouter();

  // Add dark class to html element
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">N</span>
            </div>
            <span className="font-medium text-sm tracking-tight">NailBook</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-muted text-sm"
            onClick={() => router.push("/admin")}
          >
            ورود
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs mb-8 border border-border">
            <span className="h-1 w-1 rounded-full bg-emerald-500" />
            پنل مدیریت
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-5">
            مدیریت سالن‌ها
          </h1>
          <p className="text-muted-foreground text-base max-w-md mb-10 leading-relaxed">
            رزرو آنلاین، مدیریت کاربران، و درآمد — همه از یک پنل.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 font-medium"
              onClick={() => router.push("/admin")}
            >
              ورود
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => router.push("/admin/bootstrap")}
            >
              شروع
            </Button>
          </div>
        </div>
      </section>

      {/* Features — minimal grid */}
      <section className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
            {[
              { icon: Store, label: "سالن‌ها", desc: "ایجاد و مدیریت" },
              { icon: Users, label: "کاربران", desc: "مدیران و مشتریان" },
              { icon: Calendar, label: "رزروها", desc: "رزرو و درآمد" },
            ].map((f) => (
              <div key={f.label} className="bg-background p-6 group hover:bg-muted/50 transition-colors">
                <f.icon className="h-5 w-5 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
                <p className="font-medium text-sm mb-1">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>NailBook</span>
          <span>v1.0</span>
        </div>
      </footer>
    </div>
  );
}

// Salon booking page (when SALON_ID is set)
function SalonBooking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { salon, bookings, highlights, services } = useSalon();
  const [viewingHighlight, setViewingHighlight] = useState<Highlight | null>(null);

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
        <Highlights highlights={highlights} onSelect={setViewingHighlight} />
        <Hero salon={salon} onBookNow={scrollToServices} />
        <div id="services">
          <ServiceCardGrid services={services} />
        </div>
        <TrustSignals totalBookings={bookings.length} />
        <ContactButtons phone={salon.phone} />
        <footer className="px-4 py-6 text-center pb-20">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            ساخته شده با <Heart className="h-3 w-3 text-[#e74c3c] fill-[#e74c3c]" /> برای {salon.name}
          </p>
        </footer>
        <AppNavbar />
        {viewingHighlight && (
          <HighlightViewer highlight={viewingHighlight} onClose={() => setViewingHighlight(null)} />
        )}
      </div>
    </div>
    </SalonGuard>
  );
}

export default function HomePage() {
  const [isSalonMode, setIsSalonMode] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if SALON_ID is set via config endpoint
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setIsSalonMode(data.isSalon);
      })
      .catch(() => {
        // Error = admin mode
        setIsSalonMode(false);
      });
  }, []);

  // Loading state
  if (isSalonMode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">در حال بارگذاری...</div>
      </div>
    );
  }

  // Admin mode: show admin landing
  if (!isSalonMode) {
    return <AdminLanding />;
  }

  // Salon mode: show booking app
  return <SalonBooking />;
}
