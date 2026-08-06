"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Clock, Images, MapPin, MessageCircle, Phone, Sparkles, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { isValidIranianPhone } from "@/lib/digits";
import type { Highlight } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";
import { ServiceImage } from "@/components/ui/service-image";

const DAY_LABELS: Record<string, string> = {
  sat: "شنبه", sun: "یکشنبه", mon: "دوشنبه", tue: "سه‌شنبه",
  wed: "چهارشنبه", thu: "پنجشنبه", fri: "جمعه",
};

const SALON_RATING = "۴٫۹";
const SALON_SINCE = "۱۴۰۰";

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
function compactNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  return String(n);
}

export function QwenCustomerHome() {
  const router = useRouter();
  const { salon, workingHours, services, highlights, loaded } = useSalon();
  const { user, logout } = useAuth();

  const [serviceSheetOpen, setServiceSheetOpen] = useState(false);
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);
  const [activeLook, setActiveLook] = useState<Highlight | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [proof, setProof] = useState<{ totalBookings: number } | null>(null);
  const closeActiveLook = useCallback(() => setActiveLook(null), []);

  // Live booking count → social proof rail. Fails silently to static fallback.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/social-proof")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { totalBookings?: number }) => {
        if (!cancelled && typeof data.totalBookings === "number") setProof({ totalBookings: data.totalBookings });
      })
      .catch(() => { /* static fallback stands */ });
    return () => { cancelled = true; };
  }, []);

  // Image fallback chain: salon image → Unsplash-equivalent (warm editorial) → null.
  const fallbackHero = "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1400&q=82&auto=format&fit=crop";
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

  // Scroll parallax on the hero photo (rAF-throttled, honours reduced motion).
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const tick = () => {
      const node = heroRef.current;
      if (node) {
        const y = Math.min(window.scrollY, 700);
        node.style.setProperty("--qhp-parallax", `${(y * 0.18).toFixed(1)}px`);
      }
      frame = 0;
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(tick);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    tick();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Scroll-reveal stagger for sections/cards (one observer, per-card delay).
  const revealRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = revealRoot.current;
    if (!root) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      root.querySelectorAll<HTMLElement>(".qhp-reveal").forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
    root.querySelectorAll<HTMLElement>(".qhp-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loaded, highlights.length, services.length]);

  return (
    <main className="qhp-page">
      <div className="qhp-shell" dir="rtl">

        {/* HERO — compact editorial cover, shallow, above the profile */}
        <div className="qhp-hero" aria-hidden="true">
          <div ref={heroRef} className="qhp-hero-par" style={{ "--qhp-parallax": "0px" } as CSSProperties}>
            {(() => {
              const source = salon.hero_image_url && !failedImages.includes(salon.hero_image_url)
                ? salon.hero_image_url
                : !failedImages.includes(fallbackHero) ? fallbackHero : null;
              return source ? (
                <Image src={source} alt="" fill priority unoptimized
                  sizes="(max-width: 430px) 100vw, 430px"
                  className="qhp-hero-image" onError={() => markImageFailed(source)} />
              ) : <div className="qhp-hero-fallback" />;
            })()}
          </div>
          <div className="qhp-hero-wash" />
        </div>

        {/* PROFILE — story-ring avatar (tap = menu), brand, live status */}
        <section className="qhp-profile" aria-labelledby="qhp-name">
          <button type="button" className="qhp-ring qhp-mask" onClick={() => setMenuSheetOpen(true)}
            aria-label="منوی سالن" aria-haspopup="dialog">
            <span className="qhp-ring-story" aria-hidden="true" />
            <span className="qhp-ring-in">
              {(() => {
                const source = salon.portrait_image_url && !failedImages.includes(salon.portrait_image_url)
                  ? salon.portrait_image_url
                  : salon.logo_url && !failedImages.includes(salon.logo_url)
                    ? salon.logo_url
                    : !failedImages.includes(fallbackPortrait) ? fallbackPortrait : null;
                return source ? (
                  <Image src={source} alt={salon.name} fill unoptimized priority
                    sizes="112px" className="qhp-portrait"
                    onError={() => markImageFailed(source)} />
                ) : <span className="qhp-portrait-fallback" aria-hidden="true"><Sparkles className="h-8 w-8" /></span>;
              })()}
            </span>
          </button>

          <span className="qhp-kicker qhp-mask" style={{ "--md": ".12s" } as CSSProperties}>NAIL · CARE · RITUAL</span>
          <span className="qhp-mask" style={{ "--md": ".2s" } as CSSProperties}>
            <h1 id="qhp-name" className="qhp-name">{salon.name || "استودیو تخصصی ناخن"}</h1>
          </span>
          {igHandle && (
            <span className="qhp-mask" style={{ "--md": ".28s" } as CSSProperties}>
              <span className="qhp-handle" dir="ltr">@{igHandle.replace(/^@/, "")}</span>
            </span>
          )}
          {salon.slogan && (
            <span className="qhp-mask" style={{ "--md": ".34s" } as CSSProperties}>
              <span className="qhp-slogan">{salon.slogan}</span>
            </span>
          )}
          <div className="qhp-profile-row qhp-mask" style={{ "--md": ".44s" } as CSSProperties}>
            <div className="qhp-open" aria-live="polite">
              <span className={`qhp-dot ${live.isOpen ? "is-open" : ""}`} aria-hidden="true" />
              <span>{live.label}</span>
            </div>
            {salon.address && (
              <a className="qhp-location" href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer"
                aria-label="مشاهده روی نقشه">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{salon.address}</span>
              </a>
            )}
          </div>
        </section>

        {/* ACTION STACK — the link-in-bio core */}
        <section className="qhp-actions">
          {/* Primary CTA — one dominant action */}
          <button type="button" className="qhp-action qhp-action-primary qhp-mask" style={{ "--md": ".5s" } as CSSProperties}
            onClick={() => setServiceSheetOpen(true)}
            disabled={!loaded || activeServices.length === 0}>
            <span className="qhp-action-ic" aria-hidden="true">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="qhp-action-body">
              <strong>{!loaded ? "در حال آماده‌سازی" : activeServices.length ? "رزرو نوبت" : "رزرو موقتاً بسته است"}</strong>
              <small>زمان‌های آزاد را همین‌جا ببین</small>
            </span>
            <ArrowLeft className="qhp-action-chev h-5 w-5" aria-hidden="true" />
          </button>

          {/* Lookbook entry — opens the highlight sheet */}
          {highlights.length > 0 && (
            <button type="button" className="qhp-action qhp-mask" style={{ "--md": ".56s" } as CSSProperties}
              onClick={() => setActiveLook(highlights[0])}>
              <span className="qhp-action-ic" aria-hidden="true"><Images className="h-5 w-5" /></span>
              <span className="qhp-action-body">
                <strong>نمونه‌کارها</strong>
                <small>برای الهام گرفتن</small>
              </span>
              <ArrowLeft className="qhp-action-chev h-5 w-5" aria-hidden="true" />
            </button>
          )}

          {/* Instagram — the reason they came */}
          {igHandle && (
            <a className="qhp-action qhp-mask" style={{ "--md": ".62s" } as CSSProperties}
              href={`https://instagram.com/${igHandle.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer">
              <span className="qhp-action-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span className="qhp-action-body">
                <strong>اینستاگرام</strong>
                <small>پیگیری کنید</small>
              </span>
              <ArrowLeft className="qhp-action-chev h-5 w-5" aria-hidden="true" />
            </a>
          )}

          {/* Address / map */}
          {mapUrl && (
            <a className="qhp-action qhp-mask" style={{ "--md": ".68s" } as CSSProperties}
              href={mapUrl} target="_blank" rel="noopener noreferrer">
              <span className="qhp-action-ic" aria-hidden="true"><MapPin className="h-5 w-5" /></span>
              <span className="qhp-action-body">
                <strong>مسیریابی</strong>
                <small>روی نقشه ببین</small>
              </span>
              <ArrowLeft className="qhp-action-chev h-5 w-5" aria-hidden="true" />
            </a>
          )}

          {/* Call / SMS — compact pair (only rendered when a phone exists) */}
          {salon.phone && (
            <div className="qhp-action-row qhp-mask" style={{ "--md": ".74s" } as CSSProperties}>
              <a className="qhp-action qhp-action-compact" href={`tel:${salon.phone}`} aria-label="تماس با سالن">
                <span className="qhp-action-ic" aria-hidden="true"><Phone className="h-5 w-5" /></span>
                <span className="qhp-action-body"><strong>تماس</strong><small>تلفنی بپرس</small></span>
              </a>
              {phoneValid && (
                <a className="qhp-action qhp-action-compact" href={`sms:${salon.phone}`} aria-label="ارسال پیامک">
                  <span className="qhp-action-ic" aria-hidden="true"><MessageCircle className="h-5 w-5" /></span>
                  <span className="qhp-action-body"><strong>پیامک</strong><small>سریع جواب بده</small></span>
                </a>
              )}
            </div>
          )}
        </section>

        {/* SOCIAL PROOF — hairline-divided live stats */}
        <section className="qhp-proof qhp-reveal" aria-label="اعتماد مشتریان">
          <div className="qhp-proof-item">
            <strong>{SALON_RATING}</strong>
            <span>امتیاز</span>
          </div>
          <div className="qhp-proof-item">
            <strong>{proof ? `+${compactNum(proof.totalBookings)}` : "+۱۲۰۰"}</strong>
            <span>رزرو موفق</span>
          </div>
          <div className="qhp-proof-item">
            <strong>{SALON_SINCE}</strong>
            <span>از سال</span>
          </div>
        </section>

        {/* SERVICES — horizontal menu cards */}
        {activeServices.length > 0 && (
          <section className="qhp-section qhp-reveal" aria-labelledby="qhp-menu-t">
            <div className="qhp-sec-head">
              <h2 id="qhp-menu-t">منوی خدمات</h2>
              <i aria-hidden="true" />
              <span className="qhp-sec-kicker">MENU</span>
            </div>
            <div className="qhp-menu" ref={revealRoot}>
              {activeServices.map((s, i) => (
                <button key={s.id} type="button" className="qhp-row qhp-reveal"
                  style={{ "--ri": String(i) } as CSSProperties}
                  onClick={() => router.push(bookingUrl(s.id))} aria-label={`رزرو ${s.name}`}>
                  <span className="qhp-row-num" aria-hidden="true">
                    {toPersianDigits(String(i + 1).padStart(2, "0"))}
                  </span>
                  <span className="qhp-row-body">
                    <strong className="qhp-row-name">
                      {s.name}
                      {s.is_popular && <span className="qhp-popular">پرطرفدار</span>}
                    </strong>
                    <small className="qhp-row-dur"><Clock className="h-3 w-3" aria-hidden="true" /> {toPersianDigits(s.duration_minutes)} دقیقه</small>
                  </span>
                  <span className="qhp-row-price">
                    <b>{formatPrice(Number(s.price))}</b>
                    <small>تومان</small>
                  </span>
                  <ArrowLeft className="qhp-row-arrow" aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* LOOKBOOK — horizontal gallery */}
        {highlights.length > 0 && (
          <section className="qhp-section qhp-reveal" aria-labelledby="qhp-work-t">
            <div className="qhp-sec-head">
              <h2 id="qhp-work-t">نمونه‌کارها</h2>
              <i aria-hidden="true" />
              <span className="qhp-sec-kicker">LOOKBOOK</span>
            </div>
            <div className="qhp-works">
              {highlights.map((h, idx) => {
                const svc = h.service_id ? serviceById.get(h.service_id) : undefined;
                const coverSrc = h.cover_url && !failedImages.includes(h.cover_url) ? h.cover_url : null;
                return (
                  <button key={h.id} type="button" className="qhp-work-card qhp-reveal"
                    style={{ "--ri": String(idx) } as CSSProperties}
                    onClick={() => setActiveLook(h)} aria-label={`دیدن ${h.name}`}>
                    {coverSrc ? (
                      <Image src={coverSrc} alt={h.name} fill unoptimized loading="lazy"
                        sizes="220px" className="qhp-work-image"
                        onError={() => markImageFailed(coverSrc)} />
                    ) : (
                      <span className="qhp-work-fallback" aria-hidden="true">
                        <Images className="h-9 w-9" />
                        <strong>{h.name.charAt(0)}</strong>
                      </span>
                    )}
                    <span className="qhp-work-shade" aria-hidden="true" />
                    <span className="qhp-work-caption">
                      <span className="qhp-work-name">{h.name}</span>
                      {svc ? (
                        <span className="qhp-work-price">{formatPrice(Number(svc.price))} <small>تومان</small></span>
                      ) : (
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* CONTACT */}
        <section className="qhp-contact qhp-reveal">
          <p className="qhp-hours"><b>ساعات کاری</b> · {formatHours(salon.working_hours_text, workingHours)}</p>
          <nav className="qhp-socials" aria-label="تماس با سالن">
            {salon.phone && (
              <a href={`tel:${salon.phone}`} aria-label="تماس">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </a>
            )}
            {igHandle && (
              <a href={`https://instagram.com/${igHandle.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                  <circle cx="12" cy="12" r="4.2" />
                  <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            )}
          </nav>
        </section>

        <footer className="qhp-foot">
          <span>{salon.name}</span>
          {salon.city && <span> · {salon.city}</span>}
        </footer>
      </div>

      {/* Sheets: service picker, top-level menu, look detail. */}
      <Sheet open={serviceSheetOpen} onClose={() => setServiceSheetOpen(false)} title="انتخاب خدمت">
        <header className="qhp-sheet-intro">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          <div>
            <strong>از کجا شروع کنیم؟</strong>
            <p>خدمت موردنظرتان را انتخاب کنید تا زمان‌های آزاد را ببینید.</p>
          </div>
        </header>
        <ul className="qhp-sheet-list">
          {activeServices.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => { setServiceSheetOpen(false); router.push(bookingUrl(s.id)); }}>
                <span className="qhp-sheet-thumb"><ServiceImage service={s} sizes="56px" className="object-cover" /></span>
                <span className="qhp-sheet-meta">
                  <strong>{s.name}</strong>
                  <small>{toPersianDigits(s.duration_minutes)} دقیقه · {formatPrice(Number(s.price))} تومان</small>
                </span>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={menuSheetOpen} onClose={() => setMenuSheetOpen(false)} title={salon.name || "منو"}>
        <nav className="qhp-home-menu" aria-label="منوی سالن">
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
      </Sheet>

      <Sheet open={activeLook !== null} onClose={closeActiveLook} title={activeLook?.name ?? "نمونه‌کار"}>
        {activeLook && (() => {
          const service = activeLook.service_id ? serviceById.get(activeLook.service_id) : undefined;
          const coverSrc = activeLook.cover_url && !failedImages.includes(activeLook.cover_url) ? activeLook.cover_url : null;
          return (
            <div className="qhp-look-body">
              <div className="qhp-look-cover">
                {coverSrc ? (
                  <Image src={coverSrc} alt={activeLook.name} fill unoptimized sizes="430px"
                    className="object-cover" onError={() => markImageFailed(coverSrc)} />
                ) : (
                  <span className="qhp-look-fallback">
                    <Images className="h-10 w-10" aria-hidden="true" />
                    <strong>{activeLook.name}</strong>
                  </span>
                )}
              </div>
              <p className="qhp-look-text">این مدل را دوست داری؟ خدمت مربوطه را در صفحهٔ رزرو باز کن تا زمان آزادش را ببینی.</p>
              <div className="qhp-look-chips">
                {service ? (
                  <>
                    <span className="qhp-chip primary">{service.name}</span>
                    <span className="qhp-chip">{toPersianDigits(service.duration_minutes)} دقیقه</span>
                    <span className="qhp-chip">{formatPrice(Number(service.price))} تومان</span>
                  </>
                ) : (
                  <span className="qhp-chip">مدل الهام‌بخش</span>
                )}
              </div>
              {service ? (
                <button type="button" className="qhp-look-cta" onClick={() => { closeActiveLook(); router.push(bookingUrl(service.id)); }}>
                  رزرو این مدل
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" className="qhp-look-cta ghost" onClick={closeActiveLook}>بستن</button>
              )}
            </div>
          );
        })()}
      </Sheet>
    </main>
  );
}

// ---- Inline sheet primitive ----
// Same lifecycle as BottomSheet (focus trap, drag-to-dismiss, body-lock, exit transition)
// but rendered inside this component tree so its styles share the qhp-* layer.

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const raf = window.requestAnimationFrame(() => setVisible(true));
      return () => {
        window.cancelAnimationFrame(raf);
        document.body.style.overflow = prevOverflow;
      };
    }
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    queueMicrotask(() => setVisible(false));
    closeTimer.current = window.setTimeout(() => {
      previousFocus.current?.focus();
      previousFocus.current = null;
      closeTimer.current = null;
    }, 260);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open && !visible) return null;

  const translateY = !visible ? "100%" : dragOffset > 0 ? `${dragOffset}px` : "0";

  return (
    <div className="qhp-sheet-wrap" role="presentation">
      <div className="qhp-sheet-scrim" aria-hidden="true"
        onClick={onClose}
        style={{ opacity: visible ? 1 : 0 }} />
      <div ref={sheetRef}
        role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className="qhp-sheet"
        style={{ transform: `translateY(${translateY})` }}>
        <div className="qhp-sheet-handle" aria-hidden="true"
          onTouchStart={(e) => { touchStartY.current = e.touches[0]?.clientY ?? 0; }}
          onTouchMove={(e) => {
            const delta = (e.touches[0]?.clientY ?? touchStartY.current) - touchStartY.current;
            if (delta > 0) setDragOffset(delta);
          }}
          onTouchEnd={() => { if (dragOffset > 110) onClose(); else setDragOffset(0); }}
        >
          <i />
        </div>
        <div className="qhp-sheet-head">
          <h3>{title}</h3>
          <button type="button" className="qhp-sheet-close" onClick={onClose} aria-label="بستن">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="qhp-sheet-content">{children}</div>
      </div>
    </div>
  );
}
