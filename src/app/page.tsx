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
import { Heart, Store, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientBackground } from "@/components/layout/gradient-background";

import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";
import type { Highlight } from "@/lib/types";

function AdminLanding() {
  const router = useRouter();

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">X</span>
            </div>
            <span className="font-semibold text-sm tracking-wider uppercase">NailBook</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="rounded px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase text-xs tracking-widest"
            onClick={() => window.location.href = "/api/auth/google"}
          >
            ورود
          </Button>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter leading-none mb-6 uppercase">
            مدیریت سالن‌ها
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mb-10 leading-relaxed">
            رزرو آنلاین، مدیریت کاربران، و درآمد — همه از یک پنل.
          </p>
          <Button
            size="lg"
            className="rounded px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase text-sm tracking-widest"
            onClick={() => window.location.href = "/api/auth/google"}
          >
            ورود با Google
          </Button>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border">
            {[
              { icon: Store, label: "سالن‌ها", desc: "ایجاد و مدیریت" },
              { icon: Users, label: "کاربران", desc: "مدیران و مشتریان" },
              { icon: Calendar, label: "رزروها", desc: "رزرو و درآمد" },
            ].map((f) => (
              <div key={f.label} className="bg-background p-6 group hover:bg-muted/20 transition-colors">
                <f.icon className="h-5 w-5 text-muted-foreground mb-3 group-hover:text-foreground transition-colors" />
                <p className="font-bold text-sm mb-1 uppercase tracking-wide">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
          <span>© 2026 NailBook</span>
          <span>v1.0</span>
        </div>
      </footer>
    </div>
  );
}

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
    <div className="relative min-h-screen paper-theme">
      <GradientBackground />
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
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setIsSalonMode(data.isSalon);
      })
      .catch(() => {
        setIsSalonMode(false);
      });
  }, []);

  if (isSalonMode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!isSalonMode) {
    return <AdminLanding />;
  }

  return <SalonBooking />;
}
