"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Hero } from "@/components/landing/hero";
import { TrustSignals } from "@/components/landing/trust-signals";
import { ContactButtons } from "@/components/landing/contact-buttons";
import { BookingCta } from "@/components/landing/booking-cta";
import { Highlights } from "@/components/landing/highlights";
import { HighlightViewer } from "@/components/landing/highlight-viewer";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Heart, Store, Users, Calendar, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradientBackground } from "@/components/layout/gradient-background";

import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";
import type { Highlight } from "@/lib/types";

function AdminLanding() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <GradientBackground />
      <div className="relative z-10">
        <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-card">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-body font-bold text-foreground">پنل مدیریت سالن</span>
            </div>
            <Button
              size="sm"
              className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold"
              onClick={() => window.location.href = "/admin/login"}
            >
              ورود
            </Button>
          </div>
        </nav>

        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-2xl mx-auto text-center md:text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-caption font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              نوبت‌دهی آنلاین سالن‌های زیبایی
            </div>
            <h1 className="text-h1 font-extrabold leading-snug mb-4">
              مدیریت سالن‌ها
            </h1>
            <p className="text-body text-muted-foreground max-w-lg mx-auto md:mx-0 mb-10 leading-relaxed">
              رزرو آنلاین، مدیریت کاربران، و درآمد — همه از یک پنل.
            </p>
            <Button
              size="lg"
              className="rounded-2xl px-8 py-4 bg-foreground text-background hover:bg-foreground/90 font-bold h-14"
              onClick={() => window.location.href = "/admin/login"}
            >
              ورود به پنل
            </Button>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: Store, label: "سالن‌ها", desc: "ایجاد و مدیریت" },
                { icon: Users, label: "کاربران", desc: "مدیران و مشتریان" },
                { icon: Calendar, label: "رزروها", desc: "رزرو و درآمد" },
              ].map((f) => (
                <div key={f.label} className="bg-card border border-border rounded-2xl p-6 group hover:shadow-elevated hover:-translate-y-0.5 transition-all">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-h3 font-bold mb-1">{f.label}</p>
                  <p className="text-caption text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-border py-6">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-small text-muted-foreground">
            <span>© ۱۴۰۵ پنل مدیریت سالن</span>
            <span className="flex items-center gap-1.5">
              ساخته شده با <Heart className="h-3 w-3 text-destructive fill-destructive" /> برای سالن‌های زیبایی
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SalonBooking() {
  const searchParams = useSearchParams();
  const { salon, bookings, highlights, services, loaded } = useSalon();
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

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
    <div className="relative min-h-screen">
      <div className="relative z-10">
        <AppHeader />
        <div className="animate-stagger">
          <Hero salon={salon} />
          <BookingCta services={services} isLoading={!loaded} />
          <TrustSignals totalBookings={bookings.filter((b) => b.status === "completed").length} recentBookings={bookings.filter((b) => b.status === "completed").slice(0, 3)} />
          <Highlights highlights={highlights} onSelect={setViewingHighlight} />
          <ContactButtons phone={salon.phone} address={salon.address} />

          <footer className="px-4 py-6 text-center pb-20">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              ساخته شده با <Heart className="h-3 w-3 text-destructive fill-destructive" /> برای {salon.name}
            </p>
          </footer>
        </div>
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
    return <div className="min-h-screen bg-background" aria-hidden="true" />;
  }

  if (!isSalonMode) {
    return <AdminLanding />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
      <SalonBooking />
    </Suspense>
  );
}
