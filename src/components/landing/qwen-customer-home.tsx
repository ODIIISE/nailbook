"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Footprints, Hand, Images, MapPin, Menu, MessageCircle, Paintbrush, Phone, Sparkles, Wrench, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ServiceImage } from "@/components/ui/service-image";
import { useMenu } from "@/components/layout/menu-context";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { isValidIranianPhone } from "@/lib/digits";
import type { Highlight, Service } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";

interface QwenCustomerHomeProps {
  onSelectHighlight: (highlight: Highlight) => void;
}

const DAY_LABELS: Record<string, string> = {
  sat: "شنبه",
  sun: "یکشنبه",
  mon: "دوشنبه",
  tue: "سه‌شنبه",
  wed: "چهارشنبه",
  thu: "پنجشنبه",
  fri: "جمعه",
};

function parseMinutes(value: string): number | null {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function getTehranScheduleNow(): { weekdayKey: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayKey = ({ Sat: "sat", Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri" } as Record<string, string>)[value("weekday")] ?? "sat";
  return { weekdayKey, minutes: Number(value("hour")) * 60 + Number(value("minute")) };
}

function getLiveLabel(hours: WorkingHours): { isOpen: boolean; label: string } {
  const now = getTehranScheduleNow();
  const today = hours[now.weekdayKey];
  if (!today) return { isOpen: false, label: "امروز · تعطیل" };
  const open = parseMinutes(today.open);
  const close = parseMinutes(today.close);
  if (open === null || close === null) return { isOpen: false, label: "ساعات کاری ثبت نشده" };
  if (now.minutes >= open && now.minutes < close) return { isOpen: true, label: `باز است · تا ${today.close}` };
  if (now.minutes < open) return { isOpen: false, label: `بازگشایی ساعت ${today.open}` };
  return { isOpen: false, label: "امروز · بسته" };
}

function formatHours(hoursText: string, hours: WorkingHours): string {
  if (hoursText.trim()) return hoursText;
  return (Object.entries(hours) as Array<[string, { open: string; close: string } | null]>)
    .filter(([, value]) => value)
    .map(([day, value]) => `${DAY_LABELS[day]} ${value!.open} تا ${value!.close}`)
    .join(" · ") || "اطلاعات ثبت نشده";
}

function InstagramGlyph() {
  return <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5" /><circle cx="12" cy="12" r="4.2" /><circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" /></svg>;
}

function ReferenceWorkCard({ highlight, onSelect }: { highlight: Highlight; onSelect: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button type="button" className="reference-home-work-card" onClick={onSelect} aria-label={`دیدن ${highlight.name}`}>
      {highlight.cover_url && !failed ? (
        <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized loading="lazy" sizes="186px" className="reference-home-work-image" onError={() => setFailed(true)} />
      ) : (
        <div className="reference-home-work-fallback" aria-hidden="true"><Images className="h-8 w-8" /><strong>{highlight.name.charAt(0)}</strong></div>
      )}
      <span className="reference-home-work-shade" aria-hidden="true" />
      <span className="reference-home-work-caption"><span>{highlight.name}</span><ArrowLeft className="h-4 w-4" aria-hidden="true" /></span>
    </button>
  );
}

function getServiceIconKey(service: Service): "hand" | "paintbrush" | "footprints" | "wrench" {
  const key = service.icon_key?.toLowerCase();
  if (key === "hand" || key === "paintbrush" || key === "footprints" || key === "wrench") return key;
  const name = service.name.toLowerCase();
  if (name.includes("ترمیم") || name.includes("repair")) return "wrench";
  if (name.includes("پدیکور") || name.includes("pedicure")) return "footprints";
  if (name.includes("ژل") || name.includes("gel") || name.includes("لاک")) return "paintbrush";
  return "hand";
}

function ServiceIcon({ service }: { service: Service }) {
  const iconKey = getServiceIconKey(service);
  if (iconKey === "paintbrush") return <Paintbrush className="h-7 w-7" strokeWidth={1.7} />;
  if (iconKey === "footprints") return <Footprints className="h-7 w-7" strokeWidth={1.7} />;
  if (iconKey === "wrench") return <Wrench className="h-7 w-7" strokeWidth={1.7} />;
  return <Hand className="h-7 w-7" strokeWidth={1.7} />;
}

function ReferenceServiceRow({ service, onSelect }: { service: Service; onSelect: () => void }) {
  const isPopular = service.is_popular === true || service.name.includes("ترمیم");
  return (
    <button type="button" className="reference-home-service" onClick={onSelect} aria-label={`رزرو ${service.name}`}>
      <span className="reference-home-service-icon" aria-hidden="true"><ServiceIcon service={service} /></span>
      <span className="reference-home-service-copy">
        <strong>{service.name}</strong>
        <small>{service.description || "خدمت تخصصی ناخن"}</small>
        <span className="reference-home-service-meta"><b>از {formatPrice(Number(service.price))} تومان</b><span>{toPersianDigits(service.duration_minutes)} دقیقه</span></span>
      </span>
      {isPopular && <span className="reference-home-popular">پرطرفدار</span>}
      <ArrowLeft className="reference-home-service-arrow h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export function QwenCustomerHome({ onSelectHighlight }: QwenCustomerHomeProps) {
  const router = useRouter();
  const { salon, workingHours, services, highlights, loaded } = useSalon();
  const { user, logout } = useAuth();
  const { open: menuOpen, openMenu, closeMenu } = useMenu();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [failedHero, setFailedHero] = useState(false);
  const [failedPortrait, setFailedPortrait] = useState(false);
  const [failedLogo, setFailedLogo] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const live = getLiveLabel(workingHours);
  const activeServices = useMemo(() => services.filter((service) => service.is_active).sort((a, b) => a.sort_order - b.sort_order), [services]);
  const phoneIsValid = isValidIranianPhone(salon.phone);
  const mapUrl = salon.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}` : null;
  const instagramHandle = salon.instagram_handle || (salon.name.toLowerCase().includes("forehand") ? "forehand.nail" : "");

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const drawer = document.querySelector<HTMLElement>(".reference-home-drawer");
      if (!drawer) return;
      const focusable = Array.from(drawer.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen, closeMenu]);

  const navigate = (href: string) => {
    closeMenu();
    router.push(href);
  };

  return (
    <main className="reference-home-page">
      <div className="reference-home-phone">
        <div className="reference-home-hero">
          <div className="reference-home-hero-background" aria-hidden="true">
            {salon.hero_image_url && !failedHero ? <Image src={salon.hero_image_url} alt="" fill priority unoptimized sizes="(max-width: 430px) 100vw, 430px" className="reference-home-hero-image" onError={() => setFailedHero(true)} /> : <div className="reference-home-hero-fallback" />}
            <div className="reference-home-hero-wash" />
          </div>

          <div className="reference-home-controls">
            <button type="button" className="reference-home-control" onClick={openMenu} aria-label="باز کردن منو" aria-expanded={menuOpen}><Menu className="h-5 w-5" aria-hidden="true" /></button>
            <ThemeToggle className="reference-home-control" />
          </div>

          <section className="reference-home-profile" aria-labelledby="reference-home-title">
            <div className="reference-home-portrait-ring">
              {salon.portrait_image_url && !failedPortrait ? <Image src={salon.portrait_image_url} alt={`تصویر ${salon.name}`} fill unoptimized className="reference-home-portrait" onError={() => setFailedPortrait(true)} /> : salon.logo_url && !failedLogo ? <Image src={salon.logo_url} alt={`لوگوی ${salon.name}`} fill unoptimized className="reference-home-portrait" onError={() => setFailedLogo(true)} /> : <div className="reference-home-portrait-fallback" aria-hidden="true"><Sparkles className="h-9 w-9" /></div>}
            </div>
            <p className="reference-home-kicker">NAIL · CARE · RITUAL</p>
            <h1 id="reference-home-title">{salon.name || "استودیو تخصصی ناخن"}</h1>
            {salon.slogan && <p className="reference-home-slogan">{salon.slogan}</p>}
            {salon.address && <a className="reference-home-location" href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" aria-hidden="true" />{salon.address}</a>}
            <div className="reference-home-open" aria-live="polite"><span className={`reference-home-status-dot ${live.isOpen ? "is-open" : ""}`} aria-hidden="true" /><Clock3 className="h-4 w-4" aria-hidden="true" /><span>{live.label}</span></div>
          </section>
        </div>

        <section className="reference-home-booking" aria-labelledby="reference-home-booking-title">
          <button type="button" className="reference-home-booking-cta" onClick={() => setBookingOpen(true)} disabled={!loaded || activeServices.length === 0}>
            <ArrowLeft className="h-7 w-7" aria-hidden="true" />
            <span><strong id="reference-home-booking-title">{activeServices.length ? "شروع رزرو" : "رزرو موقتاً بسته است"}</strong><small>{activeServices.length ? "انتخاب خدمت و زمان دلخواه" : "در حال حاضر خدمتی برای رزرو فعال نیست"}</small></span>
            <CalendarDays className="h-7 w-7" aria-hidden="true" />
          </button>
          <p>بدون تماس تلفنی · زمان‌های آزاد همین‌جا نمایش داده می‌شوند.</p>
        </section>

        {highlights.length > 0 && <section className="reference-home-section" aria-labelledby="reference-home-work-title">
          <div className="reference-home-section-heading"><div><h2 id="reference-home-work-title">نمونه‌کارها</h2><span>برای الهام گرفتن</span></div><i aria-hidden="true" /></div>
          <div className="reference-home-work-scroll">{highlights.map((highlight) => <ReferenceWorkCard key={highlight.id} highlight={highlight} onSelect={() => onSelectHighlight(highlight)} />)}</div>
        </section>}

        <section className="reference-home-section reference-home-services" aria-labelledby="reference-home-services-title">
          <div className="reference-home-section-heading"><h2 id="reference-home-services-title">خدمات ما</h2></div>
          {activeServices.length ? <div className="reference-home-service-list">{activeServices.map((service) => <ReferenceServiceRow key={service.id} service={service} onSelect={() => router.push(`/book?service=${service.id}`)} />)}</div> : <p className="reference-home-empty">هنوز خدمتی برای رزرو فعال نیست</p>}
        </section>

        <section className="reference-home-contact" aria-labelledby="reference-home-contact-title">
          <h2 id="reference-home-contact-title" className="sr-only">اطلاعات تماس</h2>
          <p><b>ساعات کاری</b> · {formatHours(salon.working_hours_text, workingHours)}</p>
          <div className="reference-home-contact-links">
            {instagramHandle && <a href={`https://instagram.com/${instagramHandle.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام سالن"><InstagramGlyph /></a>}
            {phoneIsValid && <a href={`sms:${salon.phone}`} aria-label="ارسال پیامک"><MessageCircle className="h-7 w-7" aria-hidden="true" /></a>}
            {salon.phone && <a href={`tel:${salon.phone}`} aria-label="تماس با سالن"><Phone className="h-7 w-7" aria-hidden="true" /></a>}
          </div>
        </section>

        <footer className="reference-home-footer">{salon.name}{salon.city && <><span>·</span>{salon.city}</>}</footer>
      </div>

      {menuOpen && <div className="reference-home-drawer-layer">
        <button type="button" className="reference-home-drawer-backdrop" onClick={closeMenu} aria-label="بستن منو" />
        <aside className="reference-home-drawer" role="dialog" aria-modal="true" aria-labelledby="reference-home-drawer-title">
          <div className="reference-home-drawer-head"><strong id="reference-home-drawer-title">{salon.name}</strong><button ref={drawerCloseRef} type="button" className="reference-home-drawer-close" onClick={closeMenu} aria-label="بستن منو"><X className="h-5 w-5" /></button></div>
          <nav className="reference-home-drawer-list">
            <button type="button" onClick={() => { closeMenu(); document.getElementById("reference-home-booking-title")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>رزرو نوبت</button>
            <button type="button" onClick={() => navigate("/")}>صفحه اصلی</button>
            {user ? <><button type="button" onClick={() => navigate("/profile")}>پروفایل</button><button type="button" onClick={async () => { await logout(); closeMenu(); }}>خروج</button></> : <button type="button" onClick={() => navigate("/login")}>ورود</button>}
            <button type="button" onClick={() => navigate("/owner/login")}>ورود مدیر</button>
          </nav>
        </aside>
      </div>}

      <BottomSheet open={bookingOpen} onClose={() => setBookingOpen(false)} title="انتخاب خدمت">
        <div className="reference-home-sheet-intro"><CalendarDays className="h-5 w-5" aria-hidden="true" /><div><strong>از کجا شروع کنیم؟</strong><p>خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p></div></div>
        <div className="reference-home-sheet-services">{activeServices.map((service) => <button key={service.id} type="button" onClick={() => { setBookingOpen(false); router.push(`/book?service=${service.id}`); }}><span className="reference-home-sheet-image"><ServiceImage service={service} sizes="48px" className="object-cover" /></span><span><strong>{service.name}</strong><small>{formatPrice(Number(service.price))} تومان · {toPersianDigits(service.duration_minutes)} دقیقه</small></span><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>)}</div>
      </BottomSheet>
    </main>
  );
}
