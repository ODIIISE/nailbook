"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toPersianDigits, gregorianToJalali, formatJalaliDateShort, formatJalaliTime, getJalaliWeekdayFullName } from "@/lib/jalali";
import { isValidIranianPhone } from "@/lib/digits";
import { compactToman } from "@/lib/pricing";
import { getServiceImage } from "@/lib/service-images";
import { parseGregorianDateKey } from "@/lib/time";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import { BottomNav } from "@/components/layout/bottom-nav";
import { IconFingerNail, IconArrowUpLeft } from "@/components/ui/icons";
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
  if (!today) return { isOpen: false, label: "امروز تعطیل" };
  const o = parseMinutes(today.open), c = parseMinutes(today.close);
  if (o == null || c == null) return { isOpen: false, label: "ساعات کاری ثبت نشده" };
  if (n.minutes >= o && n.minutes < c) return { isOpen: true, label: `تا ${toPersianDigits(today.close)} باز است` };
  if (n.minutes < o) return { isOpen: false, label: `از ${toPersianDigits(today.open)} باز می‌شود` };
  return { isOpen: false, label: "امروز بسته است" };
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
  images: string[];
  price: number;
  durationMinutes: number;
  service?: Service;
  addons: Addon[];
}

/** Client-only today-in-Tehran for the header date (avoids SSR mismatch).
 *  Reads the clock inside a render-time ref callback instead of setState-in-effect. */
function useTehranToday() {
  const [today, setToday] = useState<{ weekday: string; label: string } | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const now = new Date();
      const j = gregorianToJalali(now);
      setToday({
        weekday: getJalaliWeekdayFullName(now),
        label: formatJalaliDateShort(j.jy, j.jm, j.jd),
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return today;
}

export function QwenCustomerHome() {
  const router = useRouter();
  const { salon, workingHours, services, addons, highlights, bookings, loaded } = useSalon();
  const { user, logout } = useAuth();
  const today = useTehranToday();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
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

  const lookAddons = useCallback((h: { addon_ids: string[] }, svc: Service | undefined): Addon[] => {
    if (!svc) return [];
    const offered = new Set(svc.addon_ids);
    return h.addon_ids
      .filter((id) => offered.has(id))
      .map((id) => addonById.get(id))
      .filter((a): a is Addon => Boolean(a));
  }, [addonById]);

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

  const [lookIndex, setLookIndex] = useState(0);
  const lookRailRef = useRef<HTMLDivElement>(null);
  const onLookRailScroll = useCallback(() => {
    const el = lookRailRef.current;
    if (!el || looks.length < 2) return;
    const progress = Math.abs(el.scrollLeft) / Math.max(1, el.scrollWidth - el.clientWidth);
    setLookIndex(Math.min(looks.length - 1, Math.round(progress * (looks.length - 1))));
  }, [looks.length]);

  // Keep an open sheet synchronized with fresh owner data.
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
  const igHandle = salon.instagram_handle;
  const mapUrl = salon.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}` : null;

  // Client-only clock for upcoming-booking filtering (render stays pure).
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNowMs(Date.now()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Upcoming (active) bookings: nearest first, max 2, never past ones.
  const activeBookings = useMemo(() => {
    if (nowMs === null) return [];
    return bookings
      .filter((b) => b.status !== "cancelled" && b.status !== "completed")
      .map((b) => {
        const d = parseGregorianDateKey(b.date_gregorian);
        d.setHours(Number(b.start_time.slice(0, 2)), Number(b.start_time.slice(3, 5)));
        return { b, start: d.getTime() };
      })
      .filter(({ start }) => start > nowMs)
      .sort((a, z) => a.start - z.start)
      .slice(0, 2)
      .map(({ b }) => b);
  }, [bookings, nowMs]);

  const heroImage = salon.hero_image_url || "/hero-default.jpg";
  const lookbookTitle = salon.lookbook_title || "نمونه‌کارها";

  return (
    <main className="dark relative mx-auto min-h-dvh w-full max-w-[var(--frame-max-w)] bg-background pb-24 text-foreground">
      {/* ── HERO: full-bleed editorial image with identity, status and CTA ── */}
      <section className="relative" aria-label="استودیو فورهند">
        <div className="relative h-[460px] w-full overflow-hidden sm:h-[540px]">
          <Image src={heroImage} alt={salon.name || "استودیو ناخن فورهند"} fill priority
            sizes="(min-width: 480px) 480px, 100vw" className="object-cover"
            onError={() => markImageFailed(heroImage)} />
          {/* Legibility scrims — linear (gradients are reserved for scrims only,
              never decoration): deep floor for text, light top veil so the OS
              status bar reads on any photo. */}
          <div className="absolute inset-0 bg-black/25" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/80 to-black/0" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-black/0" aria-hidden="true" />

          {/* Floating identity row */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between px-5 pt-[calc(14px+env(safe-area-inset-top))]">
            <div className="flex items-center gap-2.5">
              {salon.logo_url && (
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/30">
                  <Image src={salon.logo_url} alt="" width={36} height={36} unoptimized className="h-full w-full object-contain"
                    onError={() => markImageFailed(salon.logo_url!)} />
                </span>
              )}
              <span className="flex flex-col">
                <b className="text-[13px] font-bold leading-5 text-white">{salon.name || "استودیو ناخن"}</b>
                {today && <span suppressHydrationWarning className="text-[11px] leading-4 text-white/70">{`امروز ${today.weekday} ${today.label}`}</span>}
              </span>
            </div>
            <button type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-foreground backdrop-blur-sm"
              onClick={() => setDrawerOpen(true)} aria-label="منو" aria-expanded={drawerOpen}>
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>

          {/* Bottom editorial copy */}
          <div className="absolute inset-x-0 bottom-0 px-5 pb-7">
            <p className="font-serif text-[12px] font-medium tracking-[0.24em] text-white/75">
              {salon.homepage_kicker || "NAIL · CARE · RITUAL"}
            </p>
            <h1 className="fh-hero mt-2.5 text-white" style={{ textShadow: "0 1px 14px rgba(0,0,0,0.4)" }}>
              {salon.slogan || "زیبایی، آرام و حرفه‌ای"}
            </h1>
            <p className="mt-2 max-w-[290px] text-[13px] leading-6 text-white/85">{salon.homepage_micro || "بدون تماس تلفنی · زمان‌های آزاد همین‌جا"}</p>
            <div className="mt-6 flex items-center gap-5">
              <button type="button"
                className="flex h-13 flex-[1_1_auto] items-center justify-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-[15px] font-bold text-primary-foreground shadow-elevated active:bg-primary/90 disabled:opacity-60"
                onClick={() => openBooking()}
                disabled={!loaded || activeServices.length === 0}>
                <IconFingerNail className="h-[18px] w-[18px]" aria-hidden="true" />
                <span>{!loaded ? "در حال آماده‌سازی…" : activeServices.length ? (salon.homepage_cta_label || "شروع رزرو") : "رزرو موقتاً بسته است"}</span>
              </button>
              <button type="button"
                className="flex h-13 shrink-0 items-center justify-center gap-1 text-sm font-semibold text-white active:opacity-80"
                onClick={() => document.getElementById("gallery-title")?.scrollIntoView({ block: "start" })}
                aria-label="مشاهده نمونه‌کارها">
                <span className="border-b border-white/30 pb-0.5">نمونه‌کارها</span>
                <IconArrowUpLeft aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3.5 flex items-center gap-2 text-xs text-white/80">
              <span className="inline-flex items-center gap-1.5" aria-live="polite">
                <span className={`h-1.5 w-1.5 rounded-full ${live.isOpen ? "bg-success" : "bg-white/50"}`} aria-hidden="true" />
                {live.label}
              </span>
              {salon.address && (
                <>
                  <span aria-hidden="true" className="text-white/40">·</span>
                  <span className="truncate">{salon.address}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED WORK: editorial photography, next card peeks ── */}
      {looks.length > 0 && (
        <section className="mt-14" aria-labelledby="gallery-title">
          <div className="flex items-baseline justify-between px-5">
            <h2 id="gallery-title" className="fh-sec">{lookbookTitle}</h2>
            <span dir="ltr" className="font-serif text-[13px] leading-5 text-muted-foreground tabular-nums">
              {`${toPersianDigits(lookIndex + 1)} / ${toPersianDigits(looks.length)}`}
            </span>
          </div>
          <div ref={lookRailRef} onScroll={onLookRailScroll}
            className="native-scroll scrollbar-hide mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1">
            {looks.map((look) => {
              const src = look.image && !failedImages.includes(look.image) ? look.image : null;
              return (
                <button key={look.key} type="button"
                  className="w-[70vw] max-w-[290px] shrink-0 snap-start text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openLook(look)} aria-label={`دیدن ${look.name}`}>
                  <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-[20px] bg-card">
                    {src ? (
                      <Image src={src} alt={look.name} fill unoptimized loading="lazy" sizes="(min-width: 420px) 290px, 70vw"
                        className="object-cover" onError={() => markImageFailed(src)} />
                    ) : (
                      <span className="flex h-full items-center justify-center text-4xl font-bold text-muted-foreground" aria-hidden="true">
                        {look.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <b className="mt-2.5 block truncate px-0.5 text-[15px] font-bold text-foreground">{look.name}</b>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── SERVICES: editorial list — typography and hairlines, no boxes ── */}
      {activeServices.length > 0 && (
        <section className="mt-16 px-5" aria-labelledby="services-title">
          <h2 id="services-title" className="fh-sec">خدمات</h2>
          <ul className="mt-2 divide-y divide-border/70">
            {activeServices.map((s) => (
              <li key={s.id}>
                <button type="button"
                  className="flex w-full items-start gap-4 py-4 text-start active:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => openBooking({ serviceId: s.id })}
                  aria-label={`رزرو ${s.name}`}>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[17px] font-semibold leading-7">{s.name}</b>
                    {(s.description || s.duration_minutes > 0) && (
                      <small className="flex items-center gap-1.5 text-[13px] leading-6 text-muted-foreground">
                        {s.description && <span className="truncate">{s.description}</span>}
                        {s.description && s.duration_minutes > 0 && <span aria-hidden="true" className="shrink-0">·</span>}
                        {s.duration_minutes > 0 && <span className="shrink-0">{toPersianDigits(s.duration_minutes)} دقیقه</span>}
                      </small>
                    )}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2.5 pt-1.5">
                    <span className="text-[15px] font-bold leading-5 tabular-nums">{compactToman(s.price)}</span>
                    <IconArrowUpLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground/70" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── HOW BOOKING WORKS: editorial numbered list ── */}
      <section className="mt-16 px-5" aria-labelledby="how-title">
        <h2 id="how-title" className="fh-sec">رزرو در سه قدم</h2>
        <ol className="mt-5 space-y-4">
          {[
            ["01", "انتخاب خدمت", "خدمت و طرح موردنظرت را انتخاب کن."],
            ["02", "انتخاب زمان", "از بین زمان‌های آزاد، بهترین گزینه را پیدا کن."],
            ["03", "ثبت نهایی", "رزروت را تأیید کن — بدون تماس تلفنی."],
          ].map(([n, title, desc]) => (
            <li key={n} className="flex items-baseline gap-4">
              <span dir="ltr" className="fh-num shrink-0 text-accent-foreground-soft/90" aria-hidden="true">{n}</span>
              <span className="min-w-0 flex-1">
                <b className="block text-[15px] font-semibold leading-7">{title}</b>
                <small className="block text-[13px] leading-6 text-muted-foreground">{desc}</small>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── UPCOMING BOOKINGS (only when they exist) ── */}
      {activeBookings.length > 0 && (
        <section className="mt-12 px-5" aria-labelledby="active-bookings-title">
          <h2 id="active-bookings-title" className="fh-sec">نوبت‌های پیش‌رو</h2>
          <div className="mt-2 divide-y divide-border/70">
            {activeBookings.map((b) => (
              <button key={b.id} type="button"
                className="flex w-full items-start gap-4 py-4 text-start active:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => router.push(`/bookings/${b.id}`)}
                aria-label={`نوبت ${b.service_name || b.service?.name || ""}`}>
                <span className="min-w-0 flex-1">
                  <b className="block text-[17px] font-semibold leading-7">{b.service_name || b.service?.name || "نوبت"}</b>
                  <small className="block text-[13px] leading-6 text-muted-foreground">
                    {b.date} · <span dir="ltr">{formatJalaliTime(b.start_time)}</span>
                  </small>
                </span>
                <span className="flex h-full shrink-0 items-center">
                  <IconArrowUpLeft aria-hidden="true" className="h-4 w-4 text-muted-foreground/70" />
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── ENDING: emotional close + final CTA ── */}
      <section className="mt-16 px-5" aria-label="شروع رزرو">
        <div className="border-t border-border/70 pt-10 text-center">
          <p className="fh-end text-foreground">وقتشه خودتو مهمون کنی.</p>
          <button type="button"
            className="mx-auto mt-5 flex h-12 items-center justify-center rounded-full bg-primary px-10 text-[15px] font-bold text-primary-foreground shadow-elevated active:bg-primary/90 disabled:opacity-60"
            onClick={() => openBooking()}
            disabled={!loaded || activeServices.length === 0}>
            <span>{activeServices.length ? (salon.homepage_cta_label || "شروع رزرو") : "رزرو موقتاً بسته است"}</span>
          </button>
        </div>
      </section>

      {/* ── INFO: location + socials (secondary, quiet) ── */}
      <section className="mt-12 px-5 pb-4" aria-label="تماس با سالن">
        {salon.address && (
          <a href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline" aria-label="مشاهده آدرس روی نقشه">
            <span className="truncate">{salon.address}</span>
          </a>
        )}
        <nav className="mt-3.5 flex items-center justify-center gap-2.5" aria-label="تماس با سالن">
          {salon.phone && (
            <a className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground hover:bg-muted" href={`tel:${salon.phone}`} aria-label="تماس تلفنی">
              <Phone aria-hidden="true" className="h-[18px] w-[18px]" />
            </a>
          )}
          {phoneValid && (
            <a className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground hover:bg-muted" href={`sms:${salon.phone}`} aria-label="ارسال پیامک">
              <MessageCircle aria-hidden="true" className="h-[18px] w-[18px]" />
            </a>
          )}
          {igHandle && (
            <a className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground hover:bg-muted" href={`https://instagram.com/${igHandle.replace(/^@/, "")}`}
              target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          )}
        </nav>
        <p className="mt-4 text-center text-xs leading-[1.7] text-muted-foreground">{formatHours(salon.working_hours_text, workingHours)}</p>
      </section>

      {/* ── LOOK SHEET ── */}
      <Sheet open={activeLook !== null} onClose={closeActiveLook} title="نمونه‌کار">
        {activeLook && (() => {
          const gallery = [...new Set(activeLook.images)].filter((u) => !failedImages.includes(u));
          const src = activeLookImage && gallery.includes(activeLookImage)
            ? activeLookImage
            : gallery[0] ?? null;
          return (
            <div className="flex flex-col gap-4">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted">
                {src ? (
                  <Image key={`${activeLook.key}-${src}`} src={src} alt={activeLook.name} fill unoptimized
                    sizes="430px" className="object-cover"
                    onError={() => markImageFailed(src)} />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-hidden="true">
                    <b className="text-3xl font-bold">{activeLook.name.charAt(0)}</b>
                    <strong className="px-4 text-center text-sm font-bold">{activeLook.name}</strong>
                  </span>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="native-scroll scrollbar-hide flex gap-2 overflow-x-auto" role="tablist" aria-label="تصاویر این مدل">
                  {gallery.map((u, i) => (
                    <button key={u} type="button"
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl ring-2 ${u === src ? "ring-foreground" : "ring-transparent"}`}
                      role="tab" aria-selected={u === src} aria-label={`تصویر ${toPersianDigits(i + 1)}`}
                      onClick={() => setActiveLookImage(u)}>
                      <Image src={u} alt="" fill unoptimized sizes="64px" className="object-cover"
                        onError={() => markImageFailed(u)} />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-h3">{activeLook.name}</h4>
                {activeLook.price > 0 && <span className="shrink-0 text-sm font-bold">{compactToman(activeLook.price)}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {activeLook.service ? (
                  <>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{activeLook.service.name}</span>
                    {activeLook.addons.map((a) => (
                      <span key={a.id} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">+ {a.name}</span>
                    ))}
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{toPersianDigits(activeLook.durationMinutes)} دقیقه</span>
                  </>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">مدل الهام‌بخش</span>
                )}
              </div>
              {activeLook.service ? (
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground"
                  onClick={() => { closeActiveLook(); openBooking({ serviceId: activeLook.service?.id, lookId: activeLook.key }); }}>
                  رزرو این مدل
                </button>
              ) : (
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-bold text-foreground" onClick={closeActiveLook}>بستن</button>
              )}
            </div>
          );
        })()}
      </Sheet>

      {/* ── SIDE MENU (secondary) ── */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={salon.name || "منو"}>
        <nav className="flex flex-col" aria-label="منوی سالن">
          {user ? (
            <>
              <button type="button" className="flex w-full items-center gap-3 border-b border-border px-1 py-3.5 text-start text-sm font-medium hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/bookings"); }}>
                <span>نوبت‌های من</span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 border-b border-border px-1 py-3.5 text-start text-sm font-medium hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/profile"); }}>
                <span>پروفایل من</span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 px-1 py-3.5 text-start text-sm font-medium text-destructive hover:bg-destructive/10" onClick={() => setConfirmLogout(true)}>
                <span>خروج از حساب</span>
              </button>
            </>
          ) : (
            <button type="button" className="flex w-full items-center gap-3 px-1 py-3.5 text-start text-sm font-medium hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/login"); }}>
              <span>ورود به حساب</span>
            </button>
          )}
        </nav>
        <div className="mt-6">
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => { setDrawerOpen(false); router.push("/owner/login"); }}>
            ورود مدیر
          </button>
        </div>
        <p className="mt-10 text-[11px] text-muted-foreground">{formatHours(salon.working_hours_text, workingHours)}</p>
        {salon.address && <p className="mt-1 text-[11px] text-muted-foreground">{salon.address}</p>}
      </Drawer>

      <BottomNav />

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="max-w-[300px] rounded-2xl p-5 ring-0 border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>خروج از حساب</AlertDialogTitle>
            <AlertDialogDescription>
              مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟ نوبت‌های شما محفوظ می‌ماند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={async () => { await logout(); setDrawerOpen(false); }}>خروج</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

// ---- Instant overlay primitives (stock pattern, no motion) ----

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center dark" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} className="relative z-10 flex max-h-[88dvh] w-full max-w-[var(--frame-max-w)] flex-col rounded-t-3xl border-t bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-bold">{title}</h3>
          <button ref={closeButtonRef} type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" onClick={onClose} aria-label="بستن">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 dark" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="absolute inset-y-0 end-0 flex w-[min(86vw,320px)] flex-col overflow-y-auto border-s bg-popover px-5 pt-[calc(18px+env(safe-area-inset-top))] text-popover-foreground">
        <div className="mb-4 flex items-center justify-between">
          <b className="text-sm font-bold">{title}</b>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" onClick={onClose} aria-label="بستن">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
