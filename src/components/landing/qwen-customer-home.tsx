"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, Images, MapPin, Menu, MessageCircle, Phone, Sparkles, X } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ServiceImage } from "@/components/ui/service-image";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
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
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
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

function QwenWorkCard({ highlight, onSelect }: { highlight: Highlight; onSelect: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <button type="button" className="qwen-exact-work-card" onClick={onSelect} aria-label={`دیدن ${highlight.name}`}>
      {highlight.cover_url && !failed ? (
        <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized loading="lazy" sizes="186px" className="qwen-exact-work-image" onError={() => setFailed(true)} />
      ) : (
        <div className="qwen-exact-work-fallback" aria-hidden="true"><Images className="h-8 w-8" /><strong>{highlight.name.charAt(0)}</strong></div>
      )}
      <span className="qwen-exact-work-shade" aria-hidden="true" />
      <span className="qwen-exact-work-caption"><span>{highlight.name}</span><ArrowLeft className="h-4 w-4" aria-hidden="true" /></span>
    </button>
  );
}

function ServiceRow({ service, onSelect }: { service: Service; onSelect: () => void }) {
  return (
    <button type="button" className="qwen-exact-service" onClick={onSelect} aria-label={`رزرو ${service.name}`}>
      <span className="qwen-exact-service-image"><ServiceImage service={service} alt={service.name} sizes="54px" className="object-cover" /></span>
      <span className="qwen-exact-service-copy">
        <strong>{service.name}</strong>
        <small>{service.description || "خدمت تخصصی ناخن"}</small>
        <span className="qwen-exact-service-meta"><b>{formatPrice(Number(service.price))} تومان</b><span><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{toPersianDigits(service.duration_minutes)} دقیقه</span></span>
      </span>
      <ArrowLeft className="qwen-exact-service-arrow h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export function QwenCustomerHome({ onSelectHighlight }: QwenCustomerHomeProps) {
  const router = useRouter();
  const { salon, workingHours, services, highlights, loaded } = useSalon();
  const { user, logout } = useAuth();
  const { open: menuOpen, openMenu, closeMenu } = useMenu();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [failedLogo, setFailedLogo] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const live = getLiveLabel(workingHours);
  const activeServices = useMemo(() => services.filter((service) => service.is_active).sort((a, b) => a.sort_order - b.sort_order), [services]);
  const phoneIsValid = isValidIranianPhone(salon.phone);
  const mapUrl = salon.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}` : null;

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
      const drawer = document.querySelector<HTMLElement>(".qwen-exact-drawer");
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
    <main className="qwen-exact-page">
      <div className="qwen-exact-phone">
        <div className="qwen-exact-top-actions">
          <button type="button" className="qwen-exact-round-control" onClick={openMenu} aria-label="باز کردن منو" aria-expanded={menuOpen}><Menu className="h-7 w-7" strokeWidth={1.8} /></button>
          <ThemeToggle className="qwen-exact-round-control" />
        </div>

        <section className="qwen-exact-profile" aria-labelledby="qwen-salon-name">
          <div className="qwen-exact-portrait-ring">
            {salon.logo_url && !failedLogo ? <Image src={salon.logo_url} alt={`لوگوی ${salon.name}`} fill unoptimized className="qwen-exact-portrait" onError={() => setFailedLogo(true)} /> : <div className="qwen-exact-portrait-fallback" aria-hidden="true"><Sparkles className="h-9 w-9" /></div>}
          </div>
          <p className="qwen-exact-kicker">استودیو تخصصی ناخن</p>
          <h1 id="qwen-salon-name">{salon.name || "استودیو تخصصی ناخن"}</h1>
          {salon.slogan && <p className="qwen-exact-slogan">{salon.slogan}</p>}
          {salon.address && <a className="qwen-exact-location" href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" aria-hidden="true" />{salon.address}</a>}
          <div className="qwen-exact-open-row" aria-live="polite"><span className={`qwen-exact-status-dot ${live.isOpen ? "is-open" : ""}`} aria-hidden="true" /><Clock3 className="h-4 w-4" aria-hidden="true" /><span>{live.label}</span></div>

          <div className="qwen-exact-quick-links" aria-label="راه‌های ارتباطی">
            {salon.phone && <a className="qwen-exact-quick-link" href={`tel:${salon.phone}`} aria-label="تماس با سالن"><Phone className="h-6 w-6" aria-hidden="true" /></a>}
            {phoneIsValid && <a className="qwen-exact-quick-link" href={`sms:${salon.phone}`} aria-label="ارسال پیامک"><MessageCircle className="h-6 w-6" aria-hidden="true" /></a>}
            {phoneIsValid && <a className="qwen-exact-quick-link" href={`https://wa.me/98${salon.phone.slice(1)}`} target="_blank" rel="noopener noreferrer" aria-label="تماس در واتساپ"><WhatsAppIcon className="h-6 w-6" /></a>}
          </div>
        </section>

        <section className="qwen-exact-booking-area" aria-labelledby="qwen-booking-title">
          <div className="qwen-exact-booking-card">
            <button type="button" className="qwen-exact-booking-cta" onClick={() => setBookingOpen(true)} disabled={!loaded || activeServices.length === 0}>
              <span><strong id="qwen-booking-title">{activeServices.length ? "رزرو نوبت" : "رزرو موقتاً بسته است"}</strong><small>{activeServices.length ? "انتخاب خدمت و زمان دلخواه" : "در حال حاضر خدمتی برای رزرو فعال نیست"}</small></span>
              <ArrowLeft className="h-7 w-7" aria-hidden="true" />
            </button>
          </div>
          <p className="qwen-exact-booking-note">خدمت موردنظرت را انتخاب کن؛ <b>زمان‌های آزاد</b> همین‌جا نمایش داده می‌شوند.</p>
        </section>

        {highlights.length > 0 && <section className="qwen-exact-section" aria-labelledby="qwen-work-title">
          <div className="qwen-exact-section-heading"><div><p>برای الهام گرفتن</p><h2 id="qwen-work-title">نمونه‌کارها</h2></div><ArrowLeft className="h-5 w-5" aria-hidden="true" /></div>
          <div className="qwen-exact-work-scroll">{highlights.map((highlight) => <QwenWorkCard key={highlight.id} highlight={highlight} onSelect={() => onSelectHighlight(highlight)} />)}</div>
        </section>}

        <section className="qwen-exact-section qwen-exact-services" aria-labelledby="qwen-services-title">
          <div className="qwen-exact-section-heading"><div><p>انتخاب تو</p><h2 id="qwen-services-title">خدمات ما</h2></div></div>
          {activeServices.length ? <div className="qwen-exact-service-list">{activeServices.map((service) => <ServiceRow key={service.id} service={service} onSelect={() => router.push(`/book?service=${service.id}`)} />)}</div> : <p className="qwen-exact-empty">هنوز خدمتی برای رزرو فعال نیست</p>}
        </section>

        <section className="qwen-exact-contact" aria-labelledby="qwen-contact-title">
          <h2 id="qwen-contact-title" className="sr-only">اطلاعات تماس</h2>
          <p><b>ساعات کاری</b> · {formatHours(salon.working_hours_text, workingHours)}</p>
          <div className="qwen-exact-contact-links">
            {salon.phone && <a className="qwen-exact-quick-link" href={`tel:${salon.phone}`} aria-label="تماس"><Phone className="h-6 w-6" aria-hidden="true" /></a>}
            {mapUrl && <a className="qwen-exact-quick-link" href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label="مسیریابی"><MapPin className="h-6 w-6" aria-hidden="true" /></a>}
            {phoneIsValid && <a className="qwen-exact-quick-link" href={`sms:${salon.phone}`} aria-label="پیامک"><MessageCircle className="h-6 w-6" aria-hidden="true" /></a>}
          </div>
        </section>

        <footer className="qwen-exact-footer">{salon.name}</footer>
      </div>

      {menuOpen && <div className="qwen-exact-drawer-layer">
        <button type="button" className="qwen-exact-drawer-backdrop" onClick={closeMenu} aria-label="بستن منو" />
        <aside className="qwen-exact-drawer" role="dialog" aria-modal="true" aria-labelledby="qwen-drawer-title">
          <div className="qwen-exact-drawer-head"><strong id="qwen-drawer-title">{salon.name}</strong><button ref={drawerCloseRef} type="button" className="qwen-exact-drawer-close" onClick={closeMenu} aria-label="بستن منو"><X className="h-5 w-5" /></button></div>
          <nav className="qwen-exact-drawer-list">
            <button type="button" onClick={() => { closeMenu(); document.getElementById("qwen-booking-title")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>رزرو نوبت</button>
            <button type="button" onClick={() => navigate("/")}>صفحه اصلی</button>
            {user ? <><button type="button" onClick={() => navigate("/profile")}>پروفایل</button><button type="button" onClick={async () => { await logout(); closeMenu(); }}>خروج</button></> : <button type="button" onClick={() => navigate("/login")}>ورود</button>}
            <button type="button" onClick={() => navigate("/owner/login")}>ورود مدیر</button>
          </nav>
        </aside>
      </div>}

      <BottomSheet open={bookingOpen} onClose={() => setBookingOpen(false)} title="انتخاب خدمت">
        <div className="qwen-exact-sheet-intro"><CalendarDays className="h-5 w-5" aria-hidden="true" /><div><strong>از کجا شروع کنیم؟</strong><p>خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p></div></div>
        <div className="qwen-exact-sheet-services">{activeServices.map((service) => <button key={service.id} type="button" onClick={() => { setBookingOpen(false); router.push(`/book?service=${service.id}`); }}><span className="qwen-exact-sheet-image"><ServiceImage service={service} sizes="48px" className="object-cover" /></span><span><strong>{service.name}</strong><small>{formatPrice(Number(service.price))} تومان · {toPersianDigits(service.duration_minutes)} دقیقه</small></span><ArrowLeft className="h-4 w-4" aria-hidden="true" /></button>)}</div>
      </BottomSheet>
    </main>
  );
}
