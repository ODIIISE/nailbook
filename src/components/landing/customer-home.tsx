"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Menu, MessageCircle, Phone, X, LogIn, LogOut } from "lucide-react";
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
import {
  IconSmilingGirl, IconReceipt, IconGallery, IconFingerNail, IconArrowUpLeft,
} from "@/components/ui/icons";
import type { Addon, Booking, Service } from "@/lib/types";
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
  if (n.minutes >= o && n.minutes < c) return { isOpen: true, label: `تا ${toPersianDigits(today.close)} باز` };
  if (n.minutes < o) return { isOpen: false, label: `از ${toPersianDigits(today.open)} باز` };
  return { isOpen: false, label: "امروز بسته" };
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

/** Weeks since the customer's most recent past booking (null when none). */
function weeksSinceLastVisit(bookings: Booking[], now: number): number | null {
  let latest = 0;
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const start = parseGregorianDateKey(b.date_gregorian);
    if (Number.isNaN(start.getTime())) continue;
    start.setHours(
      Number(b.start_time.slice(0, 2)),
      Number(b.start_time.slice(3, 5)),
    );
    if (start.getTime() < now && start.getTime() > latest) latest = start.getTime();
  }
  if (!latest) return null;
  return Math.floor((now - latest) / (7 * 24 * 60 * 60 * 1000));
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

  // Personal greeting + visit recency (real data, guarded). `nowMs` comes from
  // the client-only today hook so render stays pure (no Date.now() during render).
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : null;
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNowMs(Date.now()));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const weeks = user && nowMs !== null ? weeksSinceLastVisit(bookings, nowMs) : null;
  const visitNote = weeks === null
    ? (user ? "اولین نوبتت رو همین‌جا رزرو کن" : "رزرو نوبت بدون تماس تلفنی")
    : weeks === 0
      ? "چند روز از آخرین نوبتت گذشته . . ."
      : weeks === 1
        ? "یک هفته از آخرین نوبتت گذشته . . ."
        : `${toPersianDigits(weeks)} هفته از آخرین نوبتت گذشته . . .`;

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

  return (
    <main className="relative mx-auto min-h-dvh w-full max-w-[var(--frame-max-w)] bg-background px-5 pb-32 text-foreground">
      {/* ── HEADER: hamburger right (RTL), identity + live status beside it ── */}
      <header className="sticky top-0 z-40 bg-background/95 pb-3 pt-[calc(14px+env(safe-area-inset-top))]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <button type="button" className="flex h-11 w-11 items-center justify-center text-foreground"
              onClick={() => setDrawerOpen(true)} aria-label="منو" aria-expanded={drawerOpen}>
              <Menu aria-hidden="true" className="h-5 w-5" />
            </button>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[13px] font-bold leading-5">{salon.name || "استودیو ناخن"}</h1>
              <span className="text-xs font-normal leading-4 text-muted-foreground" suppressHydrationWarning>
                {today ? `امروز ${today.weekday} ${today.label}` : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 pt-1" aria-live="polite">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${live.isOpen ? "bg-success" : "bg-destructive"}`} aria-hidden="true" />
              <span className={`text-[11px] font-medium ${live.isOpen ? "text-success" : "text-muted-foreground"}`}>{live.label}</span>
            </span>
            {salon.address && (
              <a href={mapUrl ?? undefined} target="_blank" rel="noopener noreferrer"
                className="max-w-[150px] truncate text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                aria-label="مشاهده آدرس روی نقشه">
                {salon.address}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── GREETING ── */}
      <section className="mt-3" aria-live="polite">
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-bold leading-9">
            {firstName ? `${firstName} جون، خوش اومدی` : "خوش اومدی"}
          </h2>
          <IconSmilingGirl className="h-6 w-6 text-foreground" />
        </div>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{visitNote}</p>
      </section>

      {/* ── ACTIVE BOOKINGS ── */}
      <section className="mt-8" aria-labelledby="active-bookings-title">
        <div className="flex items-center gap-2">
          <IconReceipt className="h-5 w-5 text-foreground" />
          <h2 id="active-bookings-title" className="text-[15px] font-bold">نوبت‌های فعال</h2>
        </div>
        {activeBookings.length > 0 ? (
          <div className="mt-3 space-y-2">
            {activeBookings.map((b) => (
              <button key={b.id} type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-start"
                onClick={() => router.push(`/bookings/${b.id}`)}
                aria-label={`نوبت ${b.service_name || b.service?.name || ""}`}>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-bold">{b.service_name || b.service?.name || "نوبت"}</b>
                  <small className="mt-0.5 block text-xs text-muted-foreground">
                    {b.date} · <span dir="ltr">{formatJalaliTime(b.start_time)}</span>
                  </small>
                </span>
                <IconArrowUpLeft className="h-4 w-4 shrink-0 -scale-x-100 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2.5">
            <IconArrowUpLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {user ? "هنوز نوبت فعالی نداری" : "برای دیدن نوبت‌هات وارد حساب شو"}
            </span>
          </div>
        )}
      </section>

      {/* ── GALLERY ── */}
      {looks.length > 0 && (
        <section className="mt-8" aria-labelledby="gallery-title">
          <div className="flex items-center gap-2">
            <IconGallery className="h-5 w-5 text-foreground" />
            <h2 id="gallery-title" className="text-[15px] font-bold">گالری</h2>
          </div>
          <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1">
            {looks.map((look) => {
              const src = look.image && !failedImages.includes(look.image) ? look.image : null;
              return (
                <button key={look.key} type="button" className="w-40 shrink-0 text-start"
                  onClick={() => openLook(look)} aria-label={`دیدن ${look.name}`}>
                  <span className="relative block h-44 w-40 overflow-hidden rounded-xl bg-muted">
                    {src ? (
                      <Image src={src} alt={look.name} fill unoptimized loading="lazy"
                        sizes="160px" className="object-cover"
                        onError={() => markImageFailed(src)} />
                    ) : (
                      <span className="flex h-full items-center justify-center text-3xl font-bold text-muted-foreground" aria-hidden="true">
                        {look.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-bold">{look.name}</span>
                    {look.price > 0 && <span className="shrink-0 text-xs text-muted-foreground">{compactToman(look.price)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── PRIMARY CTA ── */}
      <div className="mt-8">
        <button type="button"
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
          onClick={() => openBooking()}
          disabled={!loaded || activeServices.length === 0}>
          <IconFingerNail className="h-5 w-5" aria-hidden="true" />
          <span>{!loaded ? "در حال آماده‌سازی…" : activeServices.length ? (salon.homepage_cta_label || "رزرو نوبت") : "رزرو موقتاً بسته است"}</span>
        </button>
      </div>

      {/* ── INFO STRIP: hours + socials (quiet) ── */}
      <section className="mt-10 border-t border-border pb-2 pt-5" aria-label="تماس با سالن">
        <p className="text-center text-xs leading-6 text-muted-foreground">{formatHours(salon.working_hours_text, workingHours)}</p>
        <nav className="mt-3 flex justify-center gap-2" aria-label="تماس با سالن">
          {salon.phone && (
            <a className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted" href={`tel:${salon.phone}`} aria-label="تماس">
              <Phone aria-hidden="true" className="h-5 w-5" />
            </a>
          )}
          {phoneValid && (
            <a className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted" href={`sms:${salon.phone}`} aria-label="ارسال پیامک">
              <MessageCircle aria-hidden="true" className="h-5 w-5" />
            </a>
          )}
          {igHandle && (
            <a className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted" href={`https://instagram.com/${igHandle.replace(/^@/, "")}`}
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

      {/* ── LOOK SHEET ── */}
      <Sheet open={activeLook !== null} onClose={closeActiveLook} title="نمونه‌کار">
        {activeLook && (() => {
          const gallery = [...new Set(activeLook.images)].filter((u) => !failedImages.includes(u));
          const src = activeLookImage && gallery.includes(activeLookImage)
            ? activeLookImage
            : gallery[0] ?? null;
          return (
            <div className="flex flex-col gap-4">
              <div className="relative h-56 w-full overflow-hidden rounded-xl bg-muted">
                {src ? (
                  <Image key={`${activeLook.key}-${src}`} src={src} alt={activeLook.name} fill unoptimized
                    sizes="430px" className="object-cover"
                    onError={() => markImageFailed(src)} />
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-hidden="true">
                    <IconGallery className="h-10 w-10" />
                    <strong className="px-4 text-center text-sm font-bold">{activeLook.name}</strong>
                  </span>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="flex gap-2 overflow-x-auto" role="tablist" aria-label="تصاویر این مدل">
                  {gallery.map((u, i) => (
                    <button key={u} type="button"
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${u === src ? "border-primary" : "border-transparent"}`}
                      role="tab" aria-selected={u === src} aria-label={`تصویر ${toPersianDigits(i + 1)}`}
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
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
                  onClick={() => { closeActiveLook(); openBooking({ serviceId: activeLook.service?.id, lookId: activeLook.key }); }}>
                  رزرو این مدل
                </button>
              ) : (
                <button type="button" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-bold text-foreground" onClick={closeActiveLook}>بستن</button>
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
                <IconReceipt className="h-4 w-4" />
                <span>نوبت‌های من</span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 border-b border-border px-1 py-3.5 text-start text-sm font-medium hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/profile"); }}>
                <IconSmilingGirl className="h-4 w-4" />
                <span>پروفایل من</span>
              </button>
              <button type="button" className="flex w-full items-center gap-3 px-1 py-3.5 text-start text-sm font-medium text-destructive hover:bg-destructive/10" onClick={() => setConfirmLogout(true)}>
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span>خروج از حساب</span>
              </button>
            </>
          ) : (
            <button type="button" className="flex w-full items-center gap-3 px-1 py-3.5 text-start text-sm font-medium hover:bg-muted" onClick={() => { setDrawerOpen(false); router.push("/login"); }}>
              <LogIn aria-hidden="true" className="h-4 w-4" />
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div ref={sheetRef} className="relative z-10 flex max-h-[88dvh] w-full max-w-[var(--frame-max-w)] flex-col rounded-t-2xl border-t bg-popover pb-[env(safe-area-inset-bottom)] text-popover-foreground">
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
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
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
