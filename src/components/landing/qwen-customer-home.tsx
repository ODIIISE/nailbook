"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Images,
  MapPin, Menu, MessageCircle, Phone, Sparkles,
} from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ServiceImage } from "@/components/ui/service-image";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { isValidIranianPhone } from "@/lib/digits";
import type { Highlight } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";

const DAY_LABELS: Record<string, string> = {
  sat: "شنبه", sun: "یکشنبه", mon: "دوشنبه", tue: "سه‌شنبه",
  wed: "چهارشنبه", thu: "پنجشنبه", fri: "جمعه",
};

function parseMinutes(v: string) {
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}
function getTehranNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wk = ({ Sat: "sat", Sun: "sun", Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri" } as Record<string, string>)[v("weekday")] ?? "sat";
  return { weekdayKey: wk, minutes: Number(v("hour")) * 60 + Number(v("minute")) };
}
function liveLabel(h: WorkingHours) {
  const n = getTehranNow(), today = h[n.weekdayKey];
  if (!today) return { isOpen: false, label: "امروز · تعطیل" };
  const o = parseMinutes(today.open), c = parseMinutes(today.close);
  if (o == null || c == null) return { isOpen: false, label: "ساعات کاری ثبت نشده" };
  if (n.minutes >= o && n.minutes < c) return { isOpen: true, label: `باز است · تا ${today.close}` };
  if (n.minutes < o) return { isOpen: false, label: `بازگشایی ساعت ${today.open}` };
  return { isOpen: false, label: "امروز · بسته" };
}
function formatHours(txt: string, h: WorkingHours) {
  if (txt.trim()) return txt;
  return (Object.entries(h) as Array<[string, { open: string; close: string } | null]>)
    .filter(([, v]) => v)
    .map(([d, v]) => `${DAY_LABELS[d]} ${v!.open} تا ${v!.close}`)
    .join(" · ") || "اطلاعات ثبت نشده";
}
export function QwenCustomerHome() {
  const router = useRouter();
  const { salon, workingHours, services, highlights, loaded } = useSalon();
  const { user, logout } = useAuth();

  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [activeLook, setActiveLook] = useState<Highlight | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const closeActiveLook = useCallback(() => setActiveLook(null), []);

  const fallbackHero = "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=82&auto=format&fit=crop";
  const fallbackPortrait = "https://images.unsplash.com/photo-1610992015732-2449b76311bc?w=600&q=82&auto=format&fit=crop";
  const markImageFailed = useCallback((url: string) => {
    setFailedImages((current) => current.includes(url) ? current : [...current, url]);
  }, []);

  const live = liveLabel(workingHours);
  const activeServices = useMemo(
    () => services.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [services],
  );
  const serviceById = useMemo(() => new Map(activeServices.map((s) => [s.id, s])), [activeServices]);
  const phoneValid = isValidIranianPhone(salon.phone);
  const mapUrl = salon.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}`
    : null;
  const igHandle = salon.instagram_handle || (salon.name.toLowerCase().includes("forehand") ? "forehand.nail" : "");
  const bookingUrl = (serviceId: string) => `/book?service=${encodeURIComponent(serviceId)}`;

  /* scroll reveals */
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("qh-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".qh-reveal").forEach((element) => io.observe(element));
    return () => io.disconnect();
  }, [loaded, highlights.length, services.length]);

  return (
    <main className="qh-page">
      <div className="qh-phone">

        {/* The editable cover image is used first; the fallback keeps the profile
            visually complete until the owner adds one in salon settings. */}
        <div className="qh-hero" aria-hidden="true">
          <div className="qh-hero-par">
            {(() => {
              const source = salon.hero_image_url && !failedImages.includes(salon.hero_image_url)
                ? salon.hero_image_url
                : !failedImages.includes(fallbackHero) ? fallbackHero : null;
              return source ? (
                <Image src={source} alt="" fill priority unoptimized
                  sizes="(max-width: 430px) 100vw, 430px"
                  className="qh-hero-image" onError={() => markImageFailed(source)} />
              ) : <div className="qh-hero-fallback" />;
            })()}
          </div>
          <div className="qh-hero-wash" />
        </div>

        <div className="qh-controls">
          <button type="button" className="qh-control" onClick={() => setMenuSheetOpen(true)} aria-label="باز کردن منو">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* PROFILE */}
        <section className="qh-profile" aria-labelledby="qh-title">
          <div className="qh-ring">
            <div className="qh-ring-in">
              {(() => {
                const source = salon.portrait_image_url && !failedImages.includes(salon.portrait_image_url)
                  ? salon.portrait_image_url
                  : salon.logo_url && !failedImages.includes(salon.logo_url)
                    ? salon.logo_url
                    : !failedImages.includes(fallbackPortrait) ? fallbackPortrait : null;
                return source ? (
                  <Image src={source} alt={`تصویر ${salon.name}`} fill unoptimized
                    className="qh-portrait" onError={() => markImageFailed(source)} />
                ) : <div className="qh-portrait-fallback" aria-hidden="true"><Sparkles className="h-9 w-9" /></div>;
              })()}
            </div>
          </div>

          <span className="qh-mask" style={{ "--md": ".1s" } as CSSProperties}>
            <span className="qh-kicker">NAIL · CARE · RITUAL</span>
          </span>
          <span className="qh-mask" style={{ "--md": ".18s" } as CSSProperties}>
            <h1 id="qh-title" className="qh-name">{salon.name || "استودیو تخصصی ناخن"}</h1>
          </span>
          {salon.slogan && (
            <span className="qh-mask" style={{ "--md": ".3s" } as CSSProperties}>
              <span className="qh-slogan">{salon.slogan}</span>
            </span>
          )}
          {salon.address && (
            <a className="qh-location" href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              {salon.address}
            </a>
          )}
          <div className="qh-open" aria-live="polite">
            <span className={`qh-dot ${live.isOpen ? "is-open" : ""}`} aria-hidden="true" />
            <span>{live.label}</span>
          </div>
        </section>

        {/* CTA */}
        <section className="qh-booking">
          <button type="button" className="qh-cta" onClick={() => setServiceSheetOpen(true)}
            disabled={!loaded || activeServices.length === 0}>
            <CalendarDays className="h-6 w-6" aria-hidden="true" />
            <strong>{!loaded ? "در حال آماده‌سازی" : activeServices.length ? "شروع رزرو" : "رزرو موقتاً بسته است"}</strong>
            <ArrowLeft className="qh-cta-chev h-5 w-5" aria-hidden="true" />
          </button>
          <p className="qh-micro">بدون تماس تلفنی · زمان‌های آزاد همین‌جا</p>
        </section>

        {/* LOOKBOOK */}
        {highlights.length > 0 && (
          <section className="qh-section qh-reveal" aria-labelledby="qh-work-t">
            <div className="qh-sec-head">
              <h2 id="qh-work-t">نمونه‌کارها</h2>
              <span className="qh-sec-micro">LOOKBOOK</span>
              <i aria-hidden="true" />
            </div>
            <div className="qh-works">
              {highlights.map((h) => {
                const svc = h.service_id ? serviceById.get(h.service_id) : undefined;
                const highlightSource = h.cover_url && !failedImages.includes(h.cover_url) ? h.cover_url : null;
                return (
                  <button key={h.id} type="button" className="qh-work-card"
                    onClick={() => setActiveLook(h)} aria-label={`دیدن ${h.name}`}>
                    {highlightSource ? (
                      <Image src={highlightSource} alt={h.name} fill unoptimized loading="lazy"
                        sizes="190px" className="qh-work-image" onError={() => markImageFailed(highlightSource)} />
                    ) : (
                      <div className="qh-work-fallback" aria-hidden="true">
                        <Images className="h-8 w-8" /><strong>{h.name.charAt(0)}</strong>
                      </div>
                    )}
                    <span className="qh-work-shade" aria-hidden="true" />
                    <span className="qh-work-caption">
                      <span className="qh-work-name">{h.name}</span>
                      {svc
                        ? <span className="qh-work-price">{formatPrice(Number(svc.price))} تومان</span>
                        : <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* MENU */}
        <section className="qh-section qh-reveal" style={{ "--d": "1" } as CSSProperties}>
          <div className="qh-sec-head">
            <h2>منوی خدمات</h2>
            <span className="qh-sec-micro">MENU</span>
            <i aria-hidden="true" />
          </div>
          {activeServices.length ? (
            <div className="qh-menu">
              {activeServices.map((s, i) => (
                <button key={s.id} type="button" className="qh-menu-row"
                  onClick={() => router.push(bookingUrl(s.id))} aria-label={`رزرو ${s.name}`}>
                  <span className="qh-num" aria-hidden="true">{toPersianDigits(String(i + 1).padStart(2, "0"))}</span>
                  <span className="qh-body">
                    <strong>
                      {s.name}
                      {s.is_popular && <span className="qh-popular">پرطرفدار</span>}
                    </strong>
                    <small>{toPersianDigits(s.duration_minutes)} دقیقه</small>
                  </span>
                  <span className="qh-price">
                    {formatPrice(Number(s.price))}
                    <small>تومان</small>
                  </span>
                  <ArrowLeft className="qh-arrow" aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : <p className="qh-empty">هنوز خدمتی برای رزرو فعال نیست</p>}
        </section>

        {/* CONTACT */}
        <section className="qh-contact qh-reveal" style={{ "--d": "1" } as CSSProperties}>
          <p className="qh-hours"><b>ساعات کاری</b> · {formatHours(salon.working_hours_text, workingHours)}</p>
          <div className="qh-socials">
            {salon.phone && (
              <a href={`tel:${salon.phone}`} aria-label="تماس با سالن"><Phone className="h-6 w-6" aria-hidden="true" /></a>
            )}
            {phoneValid && (
              <a href={`sms:${salon.phone}`} aria-label="ارسال پیامک"><MessageCircle className="h-6 w-6" aria-hidden="true" /></a>
            )}
            {igHandle && (
              <a href={`https://instagram.com/${igHandle.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            )}
          </div>
        </section>

        <footer className="qh-footer">
          {salon.name}{salon.city && <><span> · </span>{salon.city}</>}
        </footer>
      </div>

      {/* SERVICE PICKER (existing BottomSheet, restyled content) */}
      <BottomSheet
        open={serviceSheetOpen}
        onClose={() => setServiceSheetOpen(false)}
        title="انتخاب خدمت"
      >
        <div className="qh-pick-intro">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          <div>
            <strong>از کجا شروع کنیم؟</strong>
            <p>خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p>
          </div>
        </div>
        <div className="qh-pick-list">
          {activeServices.map((s) => (
            <button key={s.id} type="button" onClick={() => {
              setServiceSheetOpen(false);
              router.push(bookingUrl(s.id));
            }}>
              <span className="qh-pick-img"><ServiceImage service={s} sizes="48px" className="object-cover" /></span>
              <span className="qh-pick-meta">
                <strong>{s.name}</strong>
                <small>{formatPrice(Number(s.price))} تومان · {toPersianDigits(s.duration_minutes)} دقیقه</small>
              </span>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={menuSheetOpen} onClose={() => setMenuSheetOpen(false)} title={salon.name || "منو"}>
        <nav className="qh-home-menu" aria-label="منوی سالن">
          <button type="button" onClick={() => { setMenuSheetOpen(false); setServiceSheetOpen(true); }}>
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            <span>رزرو نوبت</span>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {user ? (
            <>
              <button type="button" onClick={() => { setMenuSheetOpen(false); router.push("/profile"); }}>
                <span>پروفایل من</span><ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={async () => { await logout(); setMenuSheetOpen(false); }}>
                <span>خروج از حساب</span><ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setMenuSheetOpen(false); router.push("/login"); }}>
              <span>ورود به حساب</span><ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => { setMenuSheetOpen(false); router.push("/owner/login"); }}>
            <span>ورود مدیر</span><ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      </BottomSheet>

      {/* LOOKBOOK DETAIL — reuse the shared sheet primitive for one modal lifecycle. */}
      <BottomSheet
        open={activeLook !== null}
        onClose={closeActiveLook}
        title={activeLook?.name ?? "مدل انتخاب‌شده"}
      >
        {activeLook && (() => {
          const service = activeLook.service_id ? serviceById.get(activeLook.service_id) : undefined;
          return (
            <div className="space-y-4">
              <div className="relative h-64 overflow-hidden rounded-2xl bg-muted">
                {activeLook.cover_url && !failedImages.includes(activeLook.cover_url) ? (
                  <Image src={activeLook.cover_url} alt={activeLook.name} fill unoptimized sizes="430px" className="object-cover" onError={() => markImageFailed(activeLook.cover_url!)} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-hidden="true">
                    <Images className="h-10 w-10" />
                    <strong>{activeLook.name}</strong>
                  </div>
                )}
              </div>
              <p className="text-small leading-7 text-muted-foreground">
                این مدل را دوست داری؟ خدمت مربوطه را در صفحهٔ رزرو باز کن.
              </p>
              <div className="flex flex-wrap gap-2">
                {service ? (
                  <>
                    <span className="rounded-full bg-primary px-3 py-1.5 text-caption font-bold text-primary-foreground">{service.name}</span>
                    <span className="rounded-full border border-border bg-card px-3 py-1.5 text-caption font-bold text-muted-foreground">{formatPrice(Number(service.price))} تومان · پایه</span>
                  </>
                ) : (
                  <span className="rounded-full border border-border bg-card px-3 py-1.5 text-caption font-bold text-muted-foreground">مدل الهام‌بخش</span>
                )}
              </div>
              {service ? (
                <button type="button" className="qh-sheet-cta" onClick={() => { closeActiveLook(); router.push(bookingUrl(service.id)); }}>
                  رزرو این مدل
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" className="qh-sheet-cta ghost" onClick={closeActiveLook}>بستن</button>
              )}
              <p className="text-center text-caption text-muted-foreground">{salon.name}</p>
            </div>
          );
        })()}
      </BottomSheet>
    </main>
  );
}
