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
import { Heart, Shield, Store, Users, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice, toPersianDigits } from "@/lib/jalali";

import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";
import type { Highlight } from "@/lib/types";

// Admin landing page (when SALON_ID is not set)
function AdminLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            پنل مدیریت
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            مدیریت سالن‌های زیبایی
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            سیستم رزرو آنلاین برای سالن‌های ناخن، آرایشگاه و خدمات زیبایی.
            همه چیز از یک پنل مدیریت می‌شود.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="xl" onClick={() => router.push("/admin")} className="gap-2">
              <Shield className="h-5 w-5" />
              ورود به پنل مدیریت
            </Button>
            <Button size="xl" variant="outline" onClick={() => router.push("/admin/bootstrap")}>
              شروع
            </Button>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">مدیریت سالن‌ها</h3>
            <p className="text-sm text-muted-foreground">
              سالن‌های خود را ایجاد، ویرایش و مدیریت کنید
            </p>
          </Card>
          <Card className="p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-success/10 flex items-center justify-center mb-4">
              <Users className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-bold text-lg mb-2">مدیریت کاربران</h3>
            <p className="text-sm text-muted-foreground">
              مدیران و مشتریان هر سالن را مدیریت کنید
            </p>
          </Card>
          <Card className="p-6 text-center">
            <div className="h-12 w-12 mx-auto rounded-xl bg-gold/10 flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-gold" />
            </div>
            <h3 className="font-bold text-lg mb-2">رزروها و درآمد</h3>
            <p className="text-sm text-muted-foreground">
              رزروها و درآمد همه سالن‌ها را مشاهده کنید
            </p>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          NailBook — سیستم رزرو آنلاین سالن زیبایی
        </p>
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
    // Check if SALON_ID is set by trying to load salon data
    fetch("/api/read/salon")
      .then((res) => res.json())
      .then((data) => {
        // If salon data exists and has an ID, we're in salon mode
        setIsSalonMode(data && data.id && data.id !== "");
      })
      .catch(() => {
        // Error means no salon configured = admin mode
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
