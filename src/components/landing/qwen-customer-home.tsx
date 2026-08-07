"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Clock, Images, MapPin, MessageCircle, Phone, Sparkles, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { toPersianDigits } from "@/lib/jalali";
import { isValidIranianPhone } from "@/lib/digits";
import { compactPrice, compactToman } from "@/lib/pricing";
import { getServiceImage } from "@/lib/service-images";
import type { Addon, Service } from "@/lib/types";
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
  if (n.minutes >= o && n.minutes < c) return { isOpen: true, label: `باز است · تا ${toPersianDigits(today.close)}` };
  if (n.minutes < o) return { isOpen: false, label: `بازگشایی ساعت ${toPersianDigits(today.open)}` };
  return { isOpen: false, label: "امروز · بسته" };
}
function formatHours(txt: string, h: WorkingHours) {
  if (txt.trim()) return txt;
  return (Object.entries(h) as Array<[string, { open: string; close: string } | null]>)
    .filter(([, v]) => v)
    .map(([d, v]) => `${DAY_LABELS[d]} ${toPersianDigits(v!.open)} تا ${toPersianDigits(v!.close)}`)
    .join(" · ") || "اطلاعات ثبت نشده";
}
interface Look {
  key: string;
  name: string;
  image: string | null;
  /** All gallery images of this highlight (cover first), for the sheet. */
  images: string[];
  price: number;
  durationMinutes: number;
  service?: Service;
  addons: Addon[];
}

const FALLBACK_HERO = "https://images.unsplash.com/photo-1599948128020-9a44505b58b3?w=1400&q=80&auto=format&fit=crop";
const FALLBACK_PORTRAIT = "https://images.unsplash.com/photo-1610992015732-2449b76311bc?w=600&q=80&auto=format&fit=crop";

export function QwenCustomerHome() {
  const router = useRouter();
  const { salon, workingHours, services, addons, highlights, loaded } = useSalon();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLook, setActiveLook] = useState<Look | null>(null);
  const [activeLookImage, setActiveLookImage] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  const openBooking = useCallback((opts?: { serviceId?: string | null; lookId?: string | null }) => {
    const params = new URLSearchParams();
    if (opts?.serviceId) params.set("service", opts.serviceId);
    if (opts?.lookId) params.set("look", opts.lookId);
    const qs = params.toString();
    router.push(qs ? `/book?${qs}` : "/book");
  }, [router]);
  const openLook = useCallback((look: Look) => {
    setActiveLook(look);
    setActiveLookImage(look.images[0] ?? look.image ?? null);
  }, []);
  const closeActiveLook = useCallback(() => {
    setActiveLook(null);
    setActiveLookImage(null);
  }, []);
  const markImageFailed = useCallback((url: string) => {
    if (!url) return;
    setFailedImages((cur) => (cur.includes(url) ? cur : [...cur, url]));
    setActiveLookImage((current) => current === url ? null : current);
  }, []);

  const live = liveLabel(workingHours);
  const activeServices = useMemo(
    () => services.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [services],
  );
  const serviceById = useMemo(() => new Map(activeServices.map((s) => [s.id, s])), [activeServices]);
  const activeAddons = useMemo(
    () => addons.filter((a) => a.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [addons],
  );
  const addonById = useMemo(() => new Map(activeAddons.map((a) => [a.id, a])), [activeAddons]);

  // Resolve the addons a look actually carries: only ones the linked service
  // offers AND that still exist and are active. Stale ids (addon deleted, or
  // the service changed owner-side) are dropped silently — never crash.
  const lookAddons = useCallback((h: { addon_ids: string[] }, svc: Service | undefined): Addon[] => {
    if (!svc) return [];
    const offered = new Set(svc.addon_ids);
    return h.addon_ids
      .filter((id) => offered.has(id))
      .map((id) => addonById.get(id))
      .filter((a): a is Addon => Boolean(a));
  }, [addonById]);

  // Lookbook: real highlights first; when the salon hasn't added any yet,
  // fall back to the active services so the gallery is never empty. A highlight
  // is visible when it has either a cover or uploaded images; the first image
  // becomes its display cover when the owner has not selected one explicitly.
  const looks = useMemo<Look[]>(() => {
    const realLooks = highlights.filter((h) => h.cover_url || h.images.some((img) => Boolean(img.image_url)));
    if (realLooks.length > 0) {
      return realLooks.map((h) => {
        const svc = h.service_id ? serviceById.get(h.service_id) : undefined;
        const addons = lookAddons(h, svc);
        const addonPrice = addons.reduce((sum, a) => sum + Number(a.price), 0);
        const addonDur = addons.reduce((sum, a) => sum + Number(a.duration_minutes), 0);
        const gallery = [...new Set([h.cover_url, ...h.images.map((img) => img.image_url)])]
          .filter((u): u is string => Boolean(u));
        const image = gallery[0] ?? null;
        return {
          key: h.id,
          name: h.name,
          image,
          images: gallery,
          price: svc ? Number(svc.price) + addonPrice : 0,
          durationMinutes: svc ? Number(svc.duration_minutes) + addonDur : 0,
          service: svc,
          addons,
        };
      });
    }
    return activeServices.map((s) => ({
      key: s.id,
      name: s.name,
      image: s.image_url || getServiceImage(s.name),
      images: [s.image_url || getServiceImage(s.name)],
      price: s.price,
      durationMinutes: s.duration_minutes,
      service: s,
      addons: [],
    }));
  }, [highlights, activeServices, serviceById, lookAddons]);

  // Keep an open sheet synchronized with fresh owner data. Without this,
  // refreshing salon data could leave stale service/addon totals or a removed
  // image selected in the dialog.
  useEffect(() => {
    if (!activeLook) return;
    const fresh = looks.find((look) => look.key === activeLook.key);
    const timer = window.setTimeout(() => {
      if (!fresh) {
        setActiveLook(null);
        setActiveLookImage(null);
        return;
      }
      setActiveLook((current) => current && current.key === fresh.key ? fresh : current);
      setActiveLookImage((current) => current && fresh.images.includes(current) && !failedImages.includes(current)
        ? current
        : fresh.images.find((url) => !failedImages.includes(url)) ?? null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeLook, looks, failedImages]);

  const phoneValid = isValidIranianPhone(salon.phone);
  const igHandle = salon.instagram_handle || (salon.name.toLowerCase().includes("forehand") ? "forehand.nail" : "");
  const mapUrl = salon.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}` : null;

  // Hero parallax — rAF-throttled, honours reduced motion.
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

  // Magnetic CTA on fine pointers only.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const el = document.querySelector<HTMLElement>(".qhp-cta");
    if (!el) return;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      el.style.transform = `translate(${x * 7}px, ${y * 5}px)`;
    };
    const leave = () => { el.style.transform = ""; };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  // Scroll-reveal for below-the-fold sections.
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".qhp-page");
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
    }, { threshold: 0.12 });
    root.querySelectorAll<HTMLElement>(".qhp-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [loaded, looks.length, activeServices.length]);

  return (
    <main className="qhp-page">
      {/* HERO — full-bleed cover with slow breathe + scroll parallax */}
      <div className="qhp-hero" aria-hidden="true">
        <div ref={heroRef} className="qhp-hero-par">
          {(() => {
            const src = salon.hero_image_url && !failedImages.includes(salon.hero_image_url)
              ? salon.hero_image_url
              : !failedImages.includes(FALLBACK_HERO) ? FALLBACK_HERO : null;
            return src ? (
              <Image src={src} alt="" fill priority unoptimized
                sizes="(max-width: 430px) 100vw, 430px"
                className="qhp-hero-img" onError={() => markImageFailed(src)} />
            ) : <div className="qhp-hero-fallback" />;
          })()}
        </div>
        <div className="qhp-hero-fade" />
      </div>

      {/* PROFILE — gold-ring portrait (tap = salon menu), editorial brand block */}
      <section className="qhp-profile" aria-label={salon.name || "سالن"}>
        <button type="button" className="qhp-ring" onClick={() => setMenuOpen(true)}
          aria-label="منوی سالن" aria-haspopup="dialog">
          <span className="qhp-ring-swatch" aria-hidden="true" />
          <span className="qhp-ring-inner">
            {(() => {
              const src = salon.portrait_image_url && !failedImages.includes(salon.portrait_image_url)
                ? salon.portrait_image_url
                : salon.logo_url && !failedImages.includes(salon.logo_url)
                  ? salon.logo_url
                  : !failedImages.includes(FALLBACK_PORTRAIT) ? FALLBACK_PORTRAIT : null;
              return src ? (
                <Image src={src} alt={salon.name || "سالن"} fill priority unoptimized
                  sizes="110px" className="qhp-portrait" onError={() => markImageFailed(src)} />
              ) : (
                <span className="qhp-portrait-fallback" aria-hidden="true"><Sparkles className="h-8 w-8" /></span>
              );
            })()}
          </span>
        </button>

        <span className="qhp-mask" style={{ "--md": ".08s" } as CSSProperties}>
          <span className="qhp-kicker">NAIL · CARE · RITUAL</span>
        </span>
        <span className="qhp-mask" style={{ "--md": ".16s" } as CSSProperties}>
          <h1 className="qhp-name">{salon.name || "استودیو ناخن"}</h1>
        </span>
        {salon.slogan && (
          <span className="qhp-mask" style={{ "--md": ".24s" } as CSSProperties}>
            <span className="qhp-tagline">{salon.slogan}</span>
          </span>
        )}

        <div className="qhp-meta">
          {salon.address && (
            <a className="qhp-addr" href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer"
              aria-label="مشاهده آدرس روی نقشه">
              <MapPin aria-hidden="true" />
              <span>{salon.address}</span>
            </a>
          )}
          <div className="qhp-open" aria-live="polite">
            <span className={`qhp-dot${live.isOpen ? "" : " is-closed"}`} aria-hidden="true" />
            <span className={live.isOpen ? "qhp-open-t" : "qhp-open-c"}>{live.label}</span>
          </div>
        </div>
      </section>

      {/* PRIMARY CTA — opens the booking flow on its own page */}
      <button type="button" className="qhp-cta magnetic" onClick={() => openBooking()}
        disabled={!loaded || activeServices.length === 0}>
        <CalendarDays aria-hidden="true" />
        <span>{!loaded ? "در حال آماده‌سازی…" : activeServices.length ? "شروع رزرو" : "رزرو موقتاً بسته است"}</span>
        <ArrowLeft className="qhp-cta-chev" aria-hidden="true" />
      </button>
      <p className="qhp-micro">بدون تماس تلفنی · زمان‌های آزاد همین‌جا</p>

      {/* LOOKBOOK — story-style rail */}
      {looks.length > 0 && (
        <section className="qhp-section qhp-reveal" aria-labelledby="qhp-work-title">
          <div className="qhp-sec-head">
            <h2 id="qhp-work-title">نمونه‌کارها</h2>
            <span className="qhp-sec-kicker">LOOKBOOK</span>
          </div>
          <div className="qhp-works">
            {looks.map((look) => {
              const src = look.image && !failedImages.includes(look.image) ? look.image : null;
              return (
                <button key={look.key} type="button" className="qhp-work-card"
                  onClick={() => openLook(look)} aria-label={`دیدن ${look.name}`}>
                  {src ? (
                    <Image src={src} alt={look.name} fill unoptimized loading="lazy"
                      sizes="190px" className="qhp-work-image"
                      onError={() => markImageFailed(src)} />
                  ) : (
                    <span className="qhp-work-fallback" aria-hidden="true">
                      <Images className="h-9 w-9" />
                      <strong>{look.name.charAt(0)}</strong>
                    </span>
                  )}
                  <span className="qhp-work-shade" aria-hidden="true" />
                  <span className="qhp-work-pill">
                    <span className="qhp-work-name">{look.name}</span>
                    {look.price > 0 ? (
                      <span className="qhp-work-price">{compactToman(look.price)}</span>
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

      {/* MENU — editorial numbered service list */}
      {activeServices.length > 0 && (
        <section className="qhp-section qhp-reveal" aria-labelledby="qhp-menu-title">
          <div className="qhp-sec-head">
            <h2 id="qhp-menu-title">منوی خدمات</h2>
            <span className="qhp-sec-kicker">MENU</span>
          </div>
          <div className="qhp-menu">
            {activeServices.map((s, i) => (
              <button key={s.id} type="button" className="qhp-row"
                onClick={() => openBooking({ serviceId: s.id })} aria-label={`رزرو ${s.name}`}>
                <span className="qhp-row-num" aria-hidden="true">
                  {toPersianDigits(String(i + 1).padStart(2, "0"))}
                </span>
                <span className="qhp-row-body">
                  <b className="qhp-row-name">
                    {s.name}
                    {s.is_popular && <span className="qhp-badge">پرطرفدار</span>}
                  </b>
                  <small className="qhp-row-dur">
                    {s.description ? `${s.description} · ` : ""}
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {toPersianDigits(s.duration_minutes)} دقیقه
                  </small>
                </span>
                <span className="qhp-row-price"><b>{compactPrice(s.price)}</b><small>تومان</small></span>
                <ArrowLeft className="qhp-row-chev" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT — hours + quiet social row */}
      <section className="qhp-contact qhp-reveal">
        <p className="qhp-hours"><b>ساعات کاری</b> · {formatHours(salon.working_hours_text, workingHours)}</p>
        <nav className="qhp-socials" aria-label="تماس با سالن">
          {salon.phone && (
            <a className="qhp-soc" href={`tel:${salon.phone}`} aria-label="تماس">
              <Phone aria-hidden="true" />
            </a>
          )}
          {phoneValid && (
            <a className="qhp-soc" href={`sms:${salon.phone}`} aria-label="ارسال پیامک">
              <MessageCircle aria-hidden="true" />
            </a>
          )}
          {igHandle && (
            <a className="qhp-soc" href={`https://instagram.com/${igHandle.replace(/^@/, "")}`}
              target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          )}
        </nav>
      </section>

      <footer className="qhp-foot">
        {salon.name}
        {salon.city && <span> — {salon.city}</span>}
      </footer>

      {/* LOOK SHEET — gallery, service + addons, computed price/duration, one CTA */}
      <Sheet open={activeLook !== null} onClose={closeActiveLook} title="نمونه‌کار">
        {activeLook && (() => {
          const gallery = [...new Set(activeLook.images)].filter((u) => !failedImages.includes(u));
          const src = activeLookImage && gallery.includes(activeLookImage)
            ? activeLookImage
            : gallery[0] ?? null;
          return (
            <div className="qhp-look-body">
              <div className="qhp-look-cover">
                {src ? (
                  <Image key={`${activeLook.key}-${src}`} src={src} alt={activeLook.name} fill unoptimized
                    sizes="430px" className="qhp-look-cover-open object-cover"
                    onError={() => markImageFailed(src)} />
                ) : (
                  <span className="qhp-look-fallback" aria-hidden="true">
                    <Images className="h-10 w-10" />
                    <strong>{activeLook.name}</strong>
                  </span>
                )}
              </div>

              {/* Gallery rail — all images the owner uploaded for this look */}
              {gallery.length > 1 && (
                <div className="qhp-look-gallery" role="tablist" aria-label="تصاویر این مدل">
                  {gallery.map((u, i) => (
                    <button key={u} type="button"
                      className={`qhp-look-thumb${u === src ? " active" : ""}`}
                      role="tab"
                      aria-selected={u === src}
                      aria-label={`تصویر ${toPersianDigits(i + 1)}`}
                      onClick={() => setActiveLookImage(u)}>
                      <Image src={u} alt="" fill unoptimized sizes="64px"
                        onError={() => markImageFailed(u)} />
                    </button>
                  ))}
                </div>
              )}

              <div className="qhp-look-title-row">
                <h4>{activeLook.name}</h4>
                {activeLook.price > 0 && <span className="qhp-look-price">{compactToman(activeLook.price)}</span>}
              </div>
              <p className="qhp-look-sub">این مدل را دوست داری؟ خدمت و آپشن‌ها همین حالا برایت رزرو می‌شود — بدون تماس تلفنی.</p>
              <div className="qhp-look-chips">
                {activeLook.service ? (
                  <>
                    <span className="qhp-chip primary">{activeLook.service.name}</span>
                    {activeLook.addons.map((a) => (
                      <span key={a.id} className="qhp-chip">+ {a.name}</span>
                    ))}
                    <span className="qhp-chip">{toPersianDigits(activeLook.durationMinutes)} دقیقه</span>
                    {activeLook.service.description && <span className="qhp-chip">{activeLook.service.description}</span>}
                  </>
                ) : (
                  <span className="qhp-chip">مدل الهام‌بخش</span>
                )}
              </div>
              {activeLook.service ? (
                <button type="button" className="qhp-look-cta"
                  onClick={() => { closeActiveLook(); openBooking({ serviceId: activeLook.service?.id, lookId: activeLook.key }); }}>
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

      {/* MENU SHEET — keeps login / profile / owner access one tap away */}
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={salon.name || "منو"}>
        <nav className="qhp-home-menu" aria-label="منوی سالن">
          <button type="button" onClick={() => { setMenuOpen(false); openBooking(); }}>
            <CalendarDays aria-hidden="true" />
            <span>رزرو نوبت</span>
            <ArrowLeft aria-hidden="true" />
          </button>
          {user ? (
            <>
              <button type="button" onClick={() => { setMenuOpen(false); router.push("/profile"); }}>
                <span>پروفایل من</span>
                <ArrowLeft aria-hidden="true" />
              </button>
              <button type="button" onClick={async () => { await logout(); setMenuOpen(false); }}>
                <span>خروج از حساب</span>
                <ArrowLeft aria-hidden="true" />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => { setMenuOpen(false); router.push("/login"); }}>
              <span>ورود به حساب</span>
              <ArrowLeft aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => { setMenuOpen(false); router.push("/owner/login"); }}>
            <span>ورود مدیر</span>
            <ArrowLeft aria-hidden="true" />
          </button>
        </nav>
      </Sheet>

    </main>
  );
}

// ---- Inline sheet primitive ----
// Focus-friendly bottom sheet: scrim tap / Escape / drag-to-dismiss, body
// lock, exit transition, focus restore. Rendered inside this component tree
// so its styles share the qhp-* layer.

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  // Keep mounting separate from visibility so the exit animation is never
  // skipped when the parent closes the sheet.
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartY = useRef(0);
  const reducedMotionRef = useRef(false);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      reducedMotionRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      let enterFrame = 0;
      let visibleFrame = 0;
      enterFrame = window.requestAnimationFrame(() => {
        setMounted(true);
        setDragOffset(0);
        visibleFrame = window.requestAnimationFrame(() => {
          setVisible(true);
          closeButtonRef.current?.focus();
        });
      });
      return () => {
        window.cancelAnimationFrame(enterFrame);
        window.cancelAnimationFrame(visibleFrame);
        document.body.style.overflow = previousOverflow;
      };
    }

    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const closeFrame = window.requestAnimationFrame(() => {
      setVisible(false);
      setDragOffset(0);
      setIsDragging(false);
    });
    const exitDuration = reducedMotionRef.current ? 0 : 600;
    closeTimer.current = window.setTimeout(() => {
      setMounted(false);
      if (previousFocus.current?.isConnected) previousFocus.current.focus();
      previousFocus.current = null;
      closeTimer.current = null;
    }, exitDuration);
    return () => {
      window.cancelAnimationFrame(closeFrame);
      if (closeTimer.current) {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ));
      if (focusable.length === 0) {
        e.preventDefault();
        sheetRef.current.focus();
        return;
      }
      if (!sheetRef.current.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!mounted) return null;

  const translateY = !visible ? "105%" : dragOffset > 0 ? `${dragOffset}px` : "0";

  return (
    <div className="qhp-sheet-wrap" role="presentation">
      <div className="qhp-sheet-scrim" aria-hidden="true"
        onClick={onClose}
        style={{ opacity: visible ? 1 : 0 }} />
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={`qhp-sheet${visible ? " qhp-sheet-entering" : ""}`}
        style={{ transform: `translateY(${translateY})`, transitionDuration: isDragging ? "0ms" : undefined }}>
        <div className="qhp-sheet-handle"
          onTouchStart={(e) => {
            touchStartY.current = e.touches[0]?.clientY ?? 0;
            setIsDragging(true);
          }}
          onTouchMove={(e) => {
            const delta = (e.touches[0]?.clientY ?? touchStartY.current) - touchStartY.current;
            if (delta > 0) setDragOffset(delta);
          }}
          onTouchEnd={() => {
            setIsDragging(false);
            if (dragOffset > 110) onClose(); else setDragOffset(0);
          }}
          aria-hidden="true">
          <i />
        </div>
        <div className="qhp-sheet-head">
          <h3>{title}</h3>
          <button ref={closeButtonRef} type="button" className="qhp-sheet-close" onClick={onClose} aria-label="بستن">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="qhp-sheet-content">{children}</div>
      </div>
    </div>
  );
}
