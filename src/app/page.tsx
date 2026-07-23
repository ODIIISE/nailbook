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

// Admin landing page (when SALON_ID is not set) — Notion-inspired design
function AdminLanding() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Grid pattern background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-[#FAFAFA]/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#2563EB] flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-[#1A1A1A]">NailBook</span>
          </div>
          <Button
            variant="ghost"
            className="text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F4F6]"
            onClick={() => router.push("/admin")}
          >
            ورود
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-xs font-medium mb-6 border border-[#BFDBFE]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-pulse" />
            پنل مدیریت سالن
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A1A1A] leading-tight mb-4" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
            مدیریت سالن‌های زیبایی
            <br />
            <span className="text-[#6B7280]">از یک مکان</span>
          </h1>
          <p className="text-lg text-[#6B7280] max-w-xl mb-8 leading-relaxed">
            سیستم رزرو آنلاین برای سالن‌های ناخن، آرایشگاه و خدمات زیبایی.
            همه چیز از یک پنل مدیریت می‌شود.
          </p>
          <div className="flex gap-3">
            <Button
              size="lg"
              className="bg-[#1A1A1A] hover:bg-[#1A1A1A]/90 text-white px-6"
              onClick={() => router.push("/admin")}
            >
              ورود به پنل مدیریت
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB]"
              onClick={() => router.push("/admin/bootstrap")}
            >
              شروع
            </Button>
          </div>
        </div>
      </section>

      {/* Features — Notion-style cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Store,
              title: "مدیریت سالن‌ها",
              description: "سالن‌های خود را ایجاد، ویرایش و مدیریت کنید. هر سالن تنظیمات مستقل دارد.",
              color: "#2563EB",
            },
            {
              icon: Users,
              title: "مدیریت کاربران",
              description: "مدیران و مشتریان هر سالن را مدیریت کنید. دسترسی‌ها را کنترل کنید.",
              color: "#059669",
            },
            {
              icon: Calendar,
              title: "رزروها و درآمد",
              description: "رزروها و درآمد همه سالن‌ها را مشاهده کنید. گزارش‌گیری کنید.",
              color: "#D97706",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="group p-5 rounded-xl border border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:shadow-sm transition-all cursor-pointer"
            >
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `${feature.color}10` }}
              >
                <feature.icon className="h-5 w-5" style={{ color: feature.color }} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">{feature.title}</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — clean numbered steps */}
      <section className="border-t border-[#E5E7EB] bg-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8" style={{ fontFamily: "'Plus Jakarta Sans', Inter, sans-serif" }}>
            شروع در ۳ مرحله
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "۱", title: "ایجاد اکانت", desc: "اکانت مدیر کل خود را بسازید" },
              { step: "۲", title: "ساخت سالن", desc: "سالن خود را با تنظیمات دلخواه ایجاد کنید" },
              { step: "۳", title: "شروع رزرو", desc: "لینک اختصاصی سالن را به مشتریان بدهید" },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <div className="h-10 w-10 rounded-full bg-[#F3F4F6] flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#6B7280]">{item.step}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1A1A1A] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#6B7280]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-sm text-[#9CA3AF]">
          <span>NailBook</span>
          <span>سیستم رزرو آنلاین سالن زیبایی</span>
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
