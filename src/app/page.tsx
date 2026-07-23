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

// Admin landing page (when SALON_ID is not set) — X.com design system
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
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-base">NailBook</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
            onClick={() => window.location.href = "/api/auth/google"}
          >
            ورود
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            مدیریت سالن‌های زیبایی
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mb-8 leading-relaxed">
            رزرو آنلاین، مدیریت کاربران، و درآمد — همه از یک پنل.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="rounded-full px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              onClick={() => window.location.href = "/api/auth/google"}
            >
              ورود با Google
            </Button>
          </div>
        </div>
      </section>

      {/* Features — X.com style cards */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Store, label: "سالن‌ها", desc: "ایجاد و مدیریت سالن‌های خود", color: "text-primary" },
              { icon: Users, label: "کاربران", desc: "مدیران و مشتریان هر سالن", color: "text-success" },
              { icon: Calendar, label: "رزروها", desc: "مشاهده رزروها و درآمد", color: "text-rose-500" },
            ].map((f) => (
              <div
                key={f.label}
                className="p-5 rounded-2xl border border-border hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <f.icon className={`h-6 w-6 ${f.color} mb-3`} />
                <p className="font-bold text-base mb-1">{f.label}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 NailBook</span>
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
