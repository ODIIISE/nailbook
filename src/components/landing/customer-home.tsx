"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowUpLeft, CalendarDays, History, Home, Images, LogIn, LogOut,
  Menu, ReceiptText, Sparkles, User, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { AppNavbar } from "@/components/layout/app-navbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatJalaliDate, formatJalaliDateShort, formatJalaliTime, gregorianToJalali, toPersianDigits } from "@/lib/jalali";
import { getTehranNow, parseGregorianDateKey } from "@/lib/time";
import { compactToman } from "@/lib/pricing";
import { getServiceImage } from "@/lib/service-images";
import { useFocusTrap } from "@/lib/hooks/use-focus-trap";
import type { Addon, Booking, Service } from "@/lib/types";

const WEEKDAYS_FA = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const ACTIVE_STATUSES: ReadonlyArray<Booking["status"]> = ["pending", "reserved", "confirmed", "in_progress"];

function parseMinutes(v: string) {
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/** True when the booking's start (Tehran date key + wall-clock minutes) lies before now. */
function isPast(b: Booking, todayKey: string, nowMinutes: number) {
  if (b.date_gregorian < todayKey) return true;
  if (b.date_gregorian > todayKey) return false;
  return (parseMinutes(b.start_time) ?? 0) < nowMinutes;
}

function weeksLabel(weeks: number) {
  if (weeks === 0) return "چند روز از آخرین نوبتت گذشته . . .";
  if (weeks === 1) return "یک هفته از آخرین نوبتت گذشته . . .";
  return `${toPersianDigits(weeks)} هفته از آخرین نوبتت گذشته . . .`;
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
  const { salon, services, addons, highlights, bookings, loaded } = useSalon();
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

  // Upcoming bookings (owner data for owners, the signed-in customer's own
  // bookings, empty for guests) — soonest first, top three surfaced.
  const activeBookings = useMemo(() => {
    const { dateKey, minutes } = getTehranNow();
    return bookings
      .filter((b) => ACTIVE_STATUSES.includes(b.status) && !isPast(b, dateKey, minutes))
      .sort((a, b) => `${a.date_gregorian}T${a.start_time}`.localeCompare(`${b.date_gregorian}T${b.start_time}`));
  }, [bookings]);

  // Time-past bookings (completed ones included) drive the "weeks since your
  // last visit" subtitle. Guests never have bookings, so they see no subtitle.
  const weeksSince = useMemo<number | null>(() => {
    if (!user) return null;
    const { dateKey, minutes } = getTehranNow();
    const latest = bookings
      .filter((b) => b.status === "completed" || isPast(b, dateKey, minutes))
      .sort((a, b) => `${b.date_gregorian}T${b.start_time}`.localeCompare(`${a.date_gregorian}T${a.start_time}`))[0];
    if (!latest) return null;
    const todayMs = parseGregorianDateKey(dateKey).getTime();
    const startMs = parseGregorianDateKey(latest.date_gregorian).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(todayMs)) return null;
    return Math.max(0, Math.floor((todayMs - startMs) / 86_400_000 / 7));
  }, [bookings, user]);

  const today = new Date();
  const jToday = gregorianToJalali(today);
  const weekdayFa = WEEKDAYS_FA[today.getDay()];
  const firstName = user?.name?.trim().split(" ")[0] || user?.name || "";

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[var(--frame-max-w)] bg-background pb-[140px] text-foreground">
      {/* HERO — full-bleed cover fading into the page background */}
      <div className="relative h-[45vh] overflow-hidden" aria-hidden="true">
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
      </div>

      {/* Static ember glow behind the hero/content seam */}
      <div className="ember-glow pointer-events-none absolute left-1/2 top-[38vh] z-0 h-[404px] w-[404px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" aria-hidden="true" />

      <div className="relative z-10">
        {/* HEADER — salon name + today (first in DOM = visual start in RTL), menu circle after */}
        <div className="flex items-center justify-between px-5">
          <div className="flex flex-col">
            <span className="text-caption font-medium text-foreground">{salon.name}</span>
            <span className="text-caption font-light text-muted-foreground" suppressHydrationWarning>
              امروز {weekdayFa} {formatJalaliDate(jToday.jy, jToday.jm, jToday.jd)}
            </span>
          </div>
          <button type="button" className="glass flex h-[74px] w-[74px] items-center justify-center rounded-full text-foreground"
            onClick={() => setDrawerOpen(true)}
            aria-label="منو" aria-expanded={drawerOpen} title="منو">
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        {/* GREETING */}
        <div className="mt-4 px-5">
          <h1 className="text-display font-bold text-foreground">
            {firstName ? `${firstName} جون، خوش اومدی` : "خوش اومدی"} <span aria-hidden="true">😊</span>
          </h1>
          {weeksSince !== null && (
            <p className="gradient-text mt-1 text-xs font-black">{weeksLabel(weeksSince)}</p>
          )}
          <div className="mt-4 h-px bg-border" />
        </div>

        {/* MY BOOKINGS — upcoming pills, guests see the empty state */}
        <section className="mt-6 px-5" aria-labelledby="my-bookings-title">
          <div className="flex items-center gap-2">
            <ReceiptText aria-hidden="true" className="h-5 w-5 text-foreground/80" />
            <h2 id="my-bookings-title" className="text-xl font-normal text-foreground">نوبت‌های من</h2>
          </div>
          <div className="mt-3 h-px bg-border" />
          {activeBookings.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              {activeBookings.slice(0, 3).map((b) => {
                const j = gregorianToJalali(parseGregorianDateKey(b.date_gregorian));
                const name = b.service?.name ?? b.service_name ?? serviceById.get(b.service_id)?.name ?? "نوبت";
                return (
                  <button key={b.id} type="button" className="glass flex w-full items-center gap-3 rounded-full px-4 py-3 text-start"
                    onClick={() => router.push(`/bookings/${b.id}`)} aria-label={`نوبت ${name}`}>
                    <span className="text-caption font-bold">{name}</span>
                    <span className="text-caption text-muted-foreground">
                      {formatJalaliDateShort(j.jy, j.jm, j.jd)} · <span dir="ltr">{formatJalaliTime(b.start_time)}</span>
                    </span>
                    <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4" />
                  </button>
                );
              })}
              {activeBookings.length > 3 && (
                <Link href="/bookings" className="flex h-11 items-center justify-center text-caption font-bold text-foreground">
                  همه
                </Link>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3">
              <ArrowUpLeft aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
              <span className="text-caption text-muted-foreground">هنوز نوبت فعالی نداری</span>
            </div>
          )}
        </section>

        {/* GALLERY — pill rail bleeding to the frame edges */}
        {looks.length > 0 && (
          <section className="mt-6 px-5" aria-labelledby="gallery-title">
            <div className="glass inline-flex h-[31px] items-center gap-2 rounded-full px-4">
              <Images aria-hidden="true" className="h-4 w-4" />
              <h2 id="gallery-title" className="text-xl font-normal">گالری</h2>
            </div>
            <div className="mt-3 h-px bg-border" />
            <div className="-mx-5 mt-4 flex gap-3 overflow-x-auto px-5 pb-2">
              {looks.map((look) => {
                const src = look.image && !failedImages.includes(look.image) ? look.image : null;
                return (
                  <button key={look.key} type="button" className="relative h-[173px] w-[91px] shrink-0 overflow-hidden rounded-full border border-border bg-card"
                    onClick={() => openLook(look)} aria-label={`دیدن ${look.name}`}>
                    {src ? (
                      <Image src={src} alt={look.name} fill unoptimized loading="lazy"
                        sizes="91px" className="object-cover"
                        onError={() => markImageFailed(src)} />
                    ) : (
                      <span className="glass flex h-full w-full items-center justify-center text-2xl font-bold" aria-hidden="true">
                        {look.name.charAt(0)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PRIMARY CTA — opens the booking flow on its own page */}
        <div className="mt-8 px-5">
          <button type="button" className="glass flex h-[72px] w-full items-center justify-center gap-3 rounded-full text-2xl font-light text-foreground/80 disabled:opacity-60"
            onClick={() => openBooking()}
            disabled={!loaded || activeServices.length === 0}>
            <span>رزرو نوبت</span>
            <Sparkles aria-hidden="true" className="h-5 w-5 text-foreground/80" />
          </button>
        </div>

        <footer className="mt-8 px-5 py-8 text-center text-caption text-muted-foreground">
          ساخته شده با <span className="text-destructive" aria-hidden="true">♥</span> برای{" "}
          <strong>{salon.name || "سالن شما"}</strong>
        </footer>
      </div>

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
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 ${u === src ? "border-primary" : "border-transparent"}`}
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
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-extrabold text-primary-foreground"
                  onClick={() => { closeActiveLook(); openBooking({ serviceId: activeLook.service?.id, lookId: activeLook.key }); }}>
                  رزرو این مدل
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-extrabold text-foreground" onClick={closeActiveLook}>بستن</button>
              )}
            </div>
          );
        })()}
      </Sheet>

      {/* SIDE MENU — home / booking / history / profile / auth / owner access */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={salon.name || "منو"}>
        <nav className="flex flex-col gap-1" aria-label="منوی سالن">
          <button type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/"); }}>
            <Home aria-hidden="true" className="h-4 w-4" />
            <span>خانه</span>
            <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
          </button>
          <button type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); openBooking(); }}>
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            <span>رزرو نوبت</span>
            <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
          </button>
          {user ? (
            <>
              <button type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/bookings"); }}>
                <History aria-hidden="true" className="h-4 w-4" />
                <span>نوبت‌های من</span>
                <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/profile"); }}>
                <User aria-hidden="true" className="h-4 w-4" />
                <span>پروفایل من</span>
                <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
              </button>
              <button type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-bold text-destructive hover:bg-destructive/10" onClick={() => setConfirmLogout(true)}>
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span>خروج از حساب</span>
                <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
              </button>
            </>
          ) : (
            <button type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-bold hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/login"); }}>
              <LogIn aria-hidden="true" className="h-4 w-4" />
              <span>ورود به حساب</span>
              <ArrowLeft aria-hidden="true" className="ms-auto h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </nav>

        <div className="mt-4">
          <button type="button" className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-bold text-muted-foreground hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/owner/login"); }}>
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

      {/* Floating bottom navigation */}
      <AppNavbar />

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
      <div ref={sheetRef} className="relative z-10 flex max-h-[88dvh] w-full max-w-[var(--frame-max-w)] flex-col rounded-t-3xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] text-foreground shadow-floating">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button ref={closeButtonRef} type="button" className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground" onClick={onClose} aria-label="بستن">
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
      <div ref={panelRef} className="absolute inset-y-0 end-0 flex w-[min(86vw,320px)] flex-col overflow-y-auto border-s border-border bg-card p-4 pt-[calc(14px+env(safe-area-inset-top))] text-foreground shadow-floating">
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
