"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Clock, History, Home, Images, LogIn, LogOut, MapPin,
  Menu, MessageCircle, Phone, User, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toPersianDigits } from "@/lib/jalali";
import { isValidIranianPhone } from "@/lib/digits";
import { compactPrice, compactToman } from "@/lib/pricing";
import { getServiceImage } from "@/lib/service-images";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
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

// Bundled local hero — zero network dependency, instant first paint.
// (The previous remote fallback went 404 silently and the hero degraded
// to a flat gradient for salons without their own image.)
const FALLBACK_HERO = "/hero-default.jpg";

export function QwenCustomerHome() {
  const router = useRouter();
  const { salon, workingHours, services, addons, highlights, loaded } = useSalon();
  const { user, logout } = useAuth();

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
  // The handle lives in owner settings (instagram_handle). No heuristic:
  // guessing from the salon name silently linked the wrong account once.
  const igHandle = salon.instagram_handle;
  const mapUrl = salon.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}` : null;

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[var(--frame-max-w)] bg-background px-5 pb-11 text-foreground">
      {/* TOP CHROME — hamburger menu (top-right) + profile (top-left), pinned to the frame.
          In RTL the first flex child sits at the visual right, so the menu button
          comes first in the DOM to land on the right and profile on the left. */}
      <div className="absolute inset-x-0 top-0 z-40 flex items-start justify-between p-4">
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm"
          onClick={() => setDrawerOpen(true)}
          aria-label="منو" aria-expanded={drawerOpen} title="منو">
          <Menu aria-hidden="true" />
        </button>
        {/* Prefetching Link (not router.push): the profile route is fetched on
            hover/load, so the first tap feels instant instead of waiting on a
            network roundtrip before the can start. */}
        <Link href="/profile" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-sm"
          aria-label="پروفایل من" title="پروفایل من">
          <User aria-hidden="true" />
        </Link>
      </div>

      {/* HERO — static cover image */}
      <div className="relative h-[420px] overflow-hidden" aria-hidden="true">
        {(() => {
          const src = salon.hero_image_url && !failedImages.includes(salon.hero_image_url)
            ? salon.hero_image_url
            : !failedImages.includes(FALLBACK_HERO) ? FALLBACK_HERO : null;
          return src ? (
            <Image src={src} alt="" fill priority unoptimized
              sizes="(max-width: 430px) 100vw, 430px"
              className="object-cover" onError={() => markImageFailed(src)} />
          ) : <div className="h-full bg-muted" />;
        })()}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      {/* PROFILE — editorial brand block */}
      <section className="flex flex-col items-center gap-1.5 px-6 pt-5 text-center" aria-label={salon.name || "سالن"}>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-muted-foreground" dir="ltr">
          {salon.homepage_kicker || "NAIL · CARE · RITUAL"}
        </span>
        <h1 className="text-display">{salon.name || "استودیو ناخن"}</h1>
        {salon.slogan && <span className="text-sm text-muted-foreground">{salon.slogan}</span>}

        <div className="mt-2 flex flex-col items-center gap-2">
          {salon.address && (
            <a className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer"
              aria-label="مشاهده آدرس روی نقشه">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{salon.address}</span>
            </a>
          )}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold shadow-sm" aria-live="polite">
            <span className={`h-2 w-2 rounded-full ${live.isOpen ? "bg-success" : "bg-destructive"}`} aria-hidden="true" />
            <span className={live.isOpen ? "text-success" : "text-muted-foreground"}>{live.label}</span>
          </div>
        </div>
      </section>

      {/* PRIMARY CTA — opens the booking flow on its own page */}
      <button type="button" className="relative z-10 my-2 flex h-14 w-full items-center justify-center gap-2.5 rounded-lg bg-primary text-base font-extrabold text-primary-foreground shadow-card disabled:opacity-60"
        onClick={() => openBooking()}
        disabled={!loaded || activeServices.length === 0}>
        <CalendarDays aria-hidden="true" />
        <span>{!loaded ? "در حال آماده‌سازی…" : activeServices.length ? (salon.homepage_cta_label || "شروع رزرو") : "رزرو موقتاً بسته است"}</span>
        <ArrowLeft className="absolute left-5 opacity-65" aria-hidden="true" />
      </button>
      <p className="relative z-10 mb-6 text-center text-xs text-muted-foreground">{salon.homepage_micro || "بدون تماس تلفنی · زمان‌های آزاد همین‌جا"}</p>

      {/* LOOKBOOK — story-style rail */}
      {looks.length > 0 && (
        <section className="py-7" aria-labelledby="lookbook-title">
          <div className="mb-3.5 flex items-baseline gap-2.5">
            <h2 id="lookbook-title" className="text-[15px] font-extrabold">{salon.lookbook_title || "نمونه‌کارها"}</h2>
            <span className="text-[9px] font-extrabold tracking-[0.24em] text-muted-foreground" dir="ltr">LOOKBOOK</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {looks.map((look) => {
              const src = look.image && !failedImages.includes(look.image) ? look.image : null;
              return (
                <button key={look.key} type="button" className="relative h-60 w-44 shrink-0 overflow-hidden rounded-lg border border-border bg-card"
                  onClick={() => openLook(look)} aria-label={`دیدن ${look.name}`}>
                  {src ? (
                    <Image src={src} alt={look.name} fill unoptimized loading="lazy"
                      sizes="190px" className="object-cover"
                      onError={() => markImageFailed(src)} />
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-hidden="true">
                      <Images className="h-9 w-9" />
                      <strong className="text-4xl font-bold">{look.name.charAt(0)}</strong>
                    </span>
                  )}
                  <span className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2 rounded-md bg-black/55 px-3 py-2.5 text-[11.5px] font-bold text-white">
                    <span className="truncate">{look.name}</span>
                    {look.price > 0 ? (
                      <span className="shrink-0">{compactToman(look.price)}</span>
                    ) : (
                      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
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
        <section className="py-7" aria-labelledby="menu-title">
          <div className="mb-3.5 flex items-baseline gap-2.5">
            <h2 id="menu-title" className="text-[15px] font-extrabold">منوی خدمات</h2>
            <span className="text-[9px] font-extrabold tracking-[0.24em] text-muted-foreground" dir="ltr">MENU</span>
          </div>
          <div>
            {activeServices.map((s, i) => (
              <button key={s.id} type="button" className="flex w-full items-center gap-3.5 border-b border-border py-4 text-start"
                onClick={() => openBooking({ serviceId: s.id })} aria-label={`رزرو ${s.name}`}>
                <span className="w-8 shrink-0 text-[22px] font-bold text-muted-foreground" dir="ltr" aria-hidden="true">
                  {toPersianDigits(String(i + 1).padStart(2, "0"))}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm font-bold">
                    {s.name}
                    {s.is_popular && <span className="ms-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">پرطرفدار</span>}
                  </b>
                  <small className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    {s.description ? `${s.description} · ` : ""}
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {toPersianDigits(s.duration_minutes)} دقیقه
                  </small>
                </span>
                <span className="whitespace-nowrap text-sm font-bold"><b>{compactPrice(s.price)}</b> <small className="text-xs font-medium text-muted-foreground">تومان</small></span>
                <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT — hours + quiet social row */}
      <section className="flex flex-col items-center gap-4 py-7">
        <p className="text-center text-xs leading-6 text-muted-foreground"><b className="font-bold text-foreground">ساعات کاری</b> · {formatHours(salon.working_hours_text, workingHours)}</p>
        <nav className="flex justify-center gap-2" aria-label="تماس با سالن">
          {salon.phone && (
            <a className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm" href={`tel:${salon.phone}`} aria-label="تماس">
              <Phone aria-hidden="true" />
            </a>
          )}
          {phoneValid && (
            <a className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm" href={`sms:${salon.phone}`} aria-label="ارسال پیامک">
              <MessageCircle aria-hidden="true" />
            </a>
          )}
          {igHandle && (
            <a className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm" href={`https://instagram.com/${igHandle.replace(/^@/, "")}`}
              target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          )}
        </nav>
      </section>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        ساخته شده با <span className="text-destructive" aria-hidden="true">♥</span> برای{" "}
        <strong>{salon.name || "سالن شما"}</strong>
      </footer>

      {/* LOOK SHEET — gallery, service + addons, computed price/duration, one CTA */}
      <Sheet open={activeLook !== null} onClose={closeActiveLook} title="نمونه‌کار">
        {activeLook && (() => {
          const gallery = [...new Set(activeLook.images)].filter((u) => !failedImages.includes(u));
          const src = activeLookImage && gallery.includes(activeLookImage)
            ? activeLookImage
            : gallery[0] ?? null;
          return (
            <div className="flex flex-col gap-4">
              <div className="relative h-56 w-full overflow-hidden rounded-lg border border-border bg-muted">
                {src ? (
                  <Image key={`${activeLook.key}-${src}`} src={src} alt={activeLook.name} fill unoptimized
                    sizes="430px" className="object-cover"
                    onError={() => markImageFailed(src)} />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-hidden="true">
                    <Images className="h-10 w-10" />
                    <strong className="px-4 text-center text-sm font-bold">{activeLook.name}</strong>
                  </span>
                )}
              </div>

              {/* Gallery rail — all images the owner uploaded for this look */}
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="تصاویر این مدل">
                  {gallery.map((u, i) => (
                    <button key={u} type="button"
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${u === src ? "border-primary" : "border-transparent"}`}
                      role="tab"
                      aria-selected={u === src}
                      aria-label={`تصویر ${toPersianDigits(i + 1)}`}
                      onClick={() => setActiveLookImage(u)}>
                      <Image src={u} alt="" fill unoptimized sizes="64px" className="object-cover"
                        onError={() => markImageFailed(u)} />
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-base font-semibold">{activeLook.name}</h4>
                {activeLook.price > 0 && <span className="shrink-0 text-sm font-bold">{compactToman(activeLook.price)}</span>}
              </div>
              <p className="text-xs leading-6 text-muted-foreground">این مدل را دوست داری؟ خدمت و آپشن‌ها همین حالا برایت رزرو می‌شود — بدون تماس تلفنی.</p>
              <div className="flex flex-wrap gap-2">
                {activeLook.service ? (
                  <>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">{activeLook.service.name}</span>
                    {activeLook.addons.map((a) => (
                      <span key={a.id} className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">+ {a.name}</span>
                    ))}
                    <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{toPersianDigits(activeLook.durationMinutes)} دقیقه</span>
                    {activeLook.service.description && <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{activeLook.service.description}</span>}
                  </>
                ) : (
                  <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">مدل الهام‌بخش</span>
                )}
              </div>
              {activeLook.service ? (
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-extrabold text-primary-foreground"
                  onClick={() => { closeActiveLook(); openBooking({ serviceId: activeLook.service?.id, lookId: activeLook.key }); }}>
                  رزرو این مدل
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border bg-popover text-sm font-extrabold text-foreground" onClick={closeActiveLook}>بستن</button>
              )}
            </div>
          );
        })()}
      </Sheet>

      {/* SIDE MENU — home / booking / history / profile / auth / owner access */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={salon.name || "منو"}>
        <nav className="flex flex-col gap-1" aria-label="منوی سالن">
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/"); }}>
            <Home aria-hidden="true" className="h-4 w-4" />
            <span>خانه</span>
            <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
          </button>
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); openBooking(); }}>
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            <span>رزرو نوبت</span>
            <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
          </button>
          {user ? (
            <>
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/bookings"); }}>
                <History aria-hidden="true" className="h-4 w-4" />
                <span>نوبت‌های من</span>
                <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/profile"); }}>
                <User aria-hidden="true" className="h-4 w-4" />
                <span>پروفایل من</span>
                <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-start text-sm font-bold text-destructive hover:bg-destructive/10" onClick={() => setConfirmLogout(true)}>
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span>خروج از حساب</span>
                <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/login"); }}>
              <LogIn aria-hidden="true" className="h-4 w-4" />
              <span>ورود به حساب</span>
              <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </nav>

        <div className="mt-4">
          <button type="button" className="flex w-full items-center gap-3 rounded-lg px-3.5 py-3 text-start text-sm font-bold text-muted-foreground hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/owner/login"); }}>
            <span>ورود مدیر</span>
            <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </Drawer>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="max-w-[300px] rounded-2xl p-5 ring-0 border-border shadow-elevated">
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} className="relative z-10 flex max-h-[88dvh] w-full max-w-[var(--frame-max-w)] flex-col rounded-t-xl border-t bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground shadow-floating">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button ref={closeButtonRef} type="button" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted" onClick={onClose} aria-label="بستن">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="absolute inset-y-0 end-0 flex w-[min(86vw,320px)] flex-col overflow-y-auto border-s bg-popover p-4 pt-[calc(14px+env(safe-area-inset-top))] text-popover-foreground shadow-floating">
        <div className="mb-3 flex items-center justify-between">
          <b className="truncate text-lg font-bold">{title}</b>
          <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground" onClick={onClose} aria-label="بستن">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
