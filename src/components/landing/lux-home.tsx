"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import styles from "./lux-home.module.css";

const d = (v: string) => ({ "--d": v }) as CSSProperties;

/* Demo slides shown until the owner uploads their own homepage gallery
 * (owner settings → «گالری صفحه اصلی»). Owner URLs always win. */
const FALLBACK_SLIDES = [
  "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=700&h=840&q=85",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=700&h=840&q=85",
  "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=700&h=840&q=85",
];

const SLIDE_MS = 4500;
const SWIPE_PX = 48;
const X_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

export function LuxHome() {
  const router = useRouter();
  const { salon, highlights } = useSalon();
  const { user, logout } = useAuth();

  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);
  const [slide, setSlide] = useState(0);
  const [autoplayTick, setAutoplayTick] = useState(0);
  const [lookbookOpen, setLookbookOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const scrollRef = useRef<HTMLElement | null>(null);
  const parRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  /* Owner-managed slideshow images (fall back to demo set until configured) */
  const slides = useMemo(() => {
    const own = (salon?.home_gallery_urls ?? []).filter((u): u is string => Boolean(u));
    return own.length ? own.slice(0, 3) : FALLBACK_SLIDES;
  }, [salon?.home_gallery_urls]);

  /* Splash → choreography (load + fallback), then settle to hand
   * transform control back to :active press feedback. */
  useEffect(() => {
    const boot = () => {
      setReady(true);
      setTimeout(() => setSplashGone(true), 750);
    };
    const fallback = setTimeout(boot, 2800);
    const delay = document.readyState === "complete" ? 500 : 1500;
    const t = setTimeout(boot, delay);
    const settle = setTimeout(() => setSettled(true), 2100);
    return () => {
      clearTimeout(t);
      clearTimeout(fallback);
      clearTimeout(settle);
    };
  }, []);

  /* Scroll parallax (media + counter-parallax badge) */
  useEffect(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const onScroll = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const y = sc.scrollTop;
      if (parRef.current) parRef.current.style.transform = `translate3d(0,${(y * 0.08).toFixed(1)}px,0)`;
      if (badgeRef.current) badgeRef.current.style.transform = `translate3d(0,${(y * -0.05).toFixed(1)}px,0)`;
    };
    sc.addEventListener("scroll", onScroll, { passive: true });
    return () => sc.removeEventListener("scroll", onScroll);
  }, []);

  /* 3D tilt — mouse on desktop, gyroscope where permitted */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tilt = tiltRef.current;
    if (!tilt) return;

    let trx = 0, tryY = 0, crx = 0, cry = 0, raf: number | null = null;
    const loop = () => {
      crx += (trx - crx) * 0.08;
      cry += (tryY - cry) * 0.08;
      tilt.style.transform = `rotateX(${crx.toFixed(2)}deg) rotateY(${cry.toFixed(2)}deg)`;
      raf =
        Math.abs(trx - crx) > 0.02 || Math.abs(tryY - cry) > 0.02
          ? requestAnimationFrame(loop)
          : null;
    };
    const set = (rx: number, ry: number) => {
      trx = rx;
      tryY = ry;
      if (raf === null) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) =>
      set(-((e.clientY / innerHeight) - 0.5) * 6, ((e.clientX / innerWidth) - 0.5) * 6);
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.gamma == null) return;
      set(
        Math.max(-10, Math.min(10, (e.beta ?? 42) - 42)) * 0.4,
        Math.max(-12, Math.min(12, e.gamma)) * 0.4,
      );
    };
    /* iOS 13+ gates motion sensors behind a user-gesture permission prompt. */
    const askGyro = () => {
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<unknown>;
      };
      DOE.requestPermission?.().catch(() => {});
    };

    if (window.matchMedia("(pointer:fine)").matches)
      addEventListener("pointermove", onMove, { passive: true });
    addEventListener("deviceorientation", onOrient, { passive: true });
    addEventListener("pointerdown", askGyro, { once: true });
    return () => {
      if (window.matchMedia("(pointer:fine)").matches)
        removeEventListener("pointermove", onMove);
      removeEventListener("deviceorientation", onOrient);
      removeEventListener("pointerdown", askGyro);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, []);

  /* Toast feedback — dismissible */
  const toast = (m: string) => {
    setToastMsg(m);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2600);
  };
  const closeToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastShow(false);
  };

  /* Address panel above the footer — auto-dismisses or closable */
  const showAddress = useCallback(() => {
    setAddrOpen(true);
    if (addrTimer.current) clearTimeout(addrTimer.current);
    addrTimer.current = setTimeout(() => setAddrOpen(false), 6000);
  }, []);
  const closeAddress = () => {
    if (addrTimer.current) clearTimeout(addrTimer.current);
    setAddrOpen(false);
  };

  /* Slideshow: autoplay every 4.5s; manual swipe/dot resets the timer */
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(
      () => setSlide((s) => (s + 1) % slides.length),
      SLIDE_MS,
    );
    return () => clearInterval(id);
  }, [slides.length, autoplayTick]);

  const goToSlide = (i: number) => {
    setSlide(((i % slides.length) + slides.length) % slides.length);
    setAutoplayTick((t) => t + 1);
  };

  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start || slides.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    /* Horizontal intent only — never hijack vertical page scrolling. */
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goToSlide(dx < 0 ? slide + 1 : slide - 1);
  };

  /* Escape closes any open layer (drawer / lookbook sheet) */
  useEffect(() => {
    if (!lookbookOpen && !drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLookbookOpen(false);
        setDrawerOpen(false);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [lookbookOpen, drawerOpen]);

  /* Move keyboard focus into the open dialog (a11y: role=dialog + aria-modal
     means the background is inert — focus must not stay behind it). */
  useEffect(() => {
    if (drawerOpen) drawerRef.current?.focus();
    else if (lookbookOpen) sheetRef.current?.focus();
  }, [drawerOpen, lookbookOpen]);

  /* Haptics (delegated; no-op where unsupported, e.g. iOS Safari) */
  const buzz = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button") && "vibrate" in navigator)
      navigator.vibrate(8);
  };

  const openDrawer = () => {
    setConfirmLogout(false);
    setDrawerOpen(true);
  };
  const handleLogout = async () => {
    setConfirmLogout(false);
    setDrawerOpen(false);
    await logout();
    router.push("/login");
  };

  const lookbookTitle = salon?.lookbook_title || "نمونه‌کارها";
  /* Strip a leading @ plus any path/protocol fragments the owner may have pasted. */
  const instagramHandle = salon?.instagram_handle?.trim().replace(/^@+/, "").split(/[/?#]/)[0] || "";
  const instagramUrl = instagramHandle ? `https://instagram.com/${encodeURIComponent(instagramHandle)}` : null;

  return (
    <div
      dir="ltr"
      lang="en"
      className={`${styles.viewport} ${ready ? styles.rootReady : ""} ${settled ? styles.settled : ""}`}
      onPointerDown={buzz}
    >
      <div className={styles.app}>
        <div className={styles.ambient} aria-hidden="true" />

        {/* Header — wordmark center, menu right */}
        <header className={`${styles.header} ${styles.rv}`} style={d(".1s")}>
          <span aria-hidden="true" />
          <span className={styles.logo}>{salon?.splash_title || "Forehand"}</span>
          <span className={styles.r}>
            <button className={styles.iconBtn} aria-label="Menu" aria-expanded={drawerOpen} onClick={openDrawer}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="13" x2="20" y2="13" /><line x1="4" y1="18" x2="12" y2="18" /></svg>
            </button>
          </span>
        </header>

        <main className={styles.scroll} ref={scrollRef}>
          {/* Hero */}
          <section className={styles.hero}>
            <p className={`${styles.script} ${styles.rvBlur}`} style={d(".2s")}>{salon?.homepage_kicker?.trim() || "Welcome to"}</p>
            <h1 className={`${styles.heroTitle} ${styles.rvBlur}`} style={d(".32s")}>{salon?.name?.trim() || "Forehand Nail Studio"}</h1>
            <p dir="rtl" lang="fa" className={`${styles.lede} ${styles.rv}`} style={d(".46s")}>
              {salon?.slogan?.trim() || "تجربه‌ای آرام و دقیق برای ناخن‌هایی که امضای تو هستند"}
            </p>

            <figure className={`${styles.media} ${styles.rvBlur}`} style={d(".6s")}>
              <div className={styles.parallax} ref={parRef}>
                <div className={styles.tilt} ref={tiltRef}>
                  <div
                    className={styles.frame}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onTouchEnd}
                  >
                    {slides.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element -- fixed-frame crossfade slides (see lux-home.module.css)
                      <img
                        key={src}
                        src={src}
                        alt={`نمونه کار ناخن ${i + 1}`}
                        width={800}
                        height={600}
                        fetchPriority={i === 0 ? "high" : undefined}
                        decoding="async"
                        draggable={false}
                        className={`${styles.slide} ${i === slide ? styles.slideOn : ""}`}
                      />
                    ))}
                  </div>
                  {/* Slide dots */}
                  <div className={styles.dots} role="tablist" aria-label="تصاویر صفحه اصلی">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        role="tab"
                        aria-selected={i === slide}
                        aria-label={`تصویر ${i + 1}`}
                        className={`${styles.dotBtn} ${i === slide ? styles.dotBtnOn : ""}`}
                        onClick={() => goToSlide(i)}
                      >
                        <span />
                      </button>
                    ))}
                  </div>
                  {/* Circular editorial label → nail-work gallery */}
                  <div className={styles.badge} ref={badgeRef}>
                    <div className={styles.badgeFloat}>
                      <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
                        <circle cx="50" cy="50" r="49" fill="#e8e0d5" />
                        <path id="ringPath" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" fill="none" />
                        <text><textPath href="#ringPath">EXPLORE NAIL DESIGNS • EXPLORE NAIL DESIGNS •</textPath></text>
                      </svg>
                      <button className={styles.badgeCore} aria-label="Explore nail designs" onClick={() => setLookbookOpen(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </figure>
          </section>
        </main>

        {/* CTAs — pinned to the bottom of the device */}
        <footer className={styles.cta}>
          {addrOpen && (
            <div dir="rtl" className={styles.addrCard} role="status">
              <span>{salon?.address?.trim() ? salon.address : "آدرس سالن ثبت نشده است"}</span>
              <button className={styles.addrClose} aria-label="بستن" onClick={closeAddress}>{X_ICON}</button>
            </div>
          )}
          <Link dir="rtl" href="/book" className={`${styles.btn} ${styles.btnPrimary} ${styles.rvPop}`} style={d(".85s")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="m9.2 12.5 2 2 3.8-3.8" /></svg>
            <span className={styles.btnFa}>{salon?.homepage_cta_label?.trim() || "رزرو نوبت"}</span>
          </Link>
          <button dir="rtl" className={`${styles.btn} ${styles.btnGhost} ${styles.rvPop}`} style={d(".95s")} onClick={() => setLookbookOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3c.7 3.9 2.4 5.6 6.3 6.3-3.9.7-5.6 2.4-6.3 6.3-.7-3.9-2.4-5.6-6.3-6.3C9.6 8.6 11.3 6.9 12 3z" /></svg>
            <span className={styles.btnFa}>نمونه کارها</span>
          </button>
          <div className={styles.contacts}>
            {salon?.phone?.trim() ? (
              <a className={styles.iconBtn} href={`tel:${salon.phone.replace(/\s+/g, "")}`} aria-label="Call the salon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 2z" /></svg>
              </a>
            ) : (
              <button className={styles.iconBtn} aria-label="Call the salon" onClick={() => toast("شماره تماس ثبت نشده است")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 2z" /></svg>
              </button>
            )}
            {instagramUrl ? (
              <a className={styles.iconBtn} href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
              </a>
            ) : (
              <button className={styles.iconBtn} aria-label="Instagram" onClick={() => toast("اینستاگرام ثبت نشده است")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
              </button>
            )}
            <button className={styles.iconBtn} aria-label="Location" onClick={showAddress}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            </button>
          </div>

          {/* Bag/menu toast — sits centered just above the footer controls */}
          <div className={`${styles.toast} ${toastShow ? styles.toastShow : ""}`} role="status" aria-live="polite">
            <span className={styles.toastMsg}>{toastMsg}</span>
            <button className={styles.toastClose} aria-label="بستن" onClick={closeToast}>{X_ICON}</button>
          </div>
        </footer>

        {/* Menu drawer — old structure, Lux design language */}
        {drawerOpen && (
          <div className={styles.sheetScrim} onClick={() => setDrawerOpen(false)} role="presentation">
            <div
              dir="rtl"
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="منوی سالن"
              tabIndex={-1}
              className={styles.drawer}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.sheetHead}>
                <span className={styles.sheetTitle}>{salon?.name || "منو"}</span>
                <button className={styles.iconBtn} aria-label="بستن" onClick={() => setDrawerOpen(false)}>{X_ICON}</button>
              </div>
              <nav className={styles.drawerNav} aria-label="منوی سالن">
                {user ? (
                  <>
                    <Link className={styles.drawerItem} href="/bookings" onClick={() => setDrawerOpen(false)}>
                      <span>نوبت‌های من</span>
                    </Link>
                    <Link className={styles.drawerItem} href="/profile" onClick={() => setDrawerOpen(false)}>
                      <span>پروفایل من</span>
                    </Link>
                    <button className={`${styles.drawerItem} ${styles.drawerItemDanger}`} onClick={() => setConfirmLogout(true)}>
                      <span>خروج از حساب</span>
                    </button>
                  </>
                ) : (
                  <Link className={styles.drawerItem} href="/login" onClick={() => setDrawerOpen(false)}>
                    <span>ورود به حساب</span>
                  </Link>
                )}
                <button className={styles.drawerItem} onClick={() => { setDrawerOpen(false); setLookbookOpen(true); }}>
                  <span>نمونه کارها</span>
                </button>
              </nav>
              <div className={styles.drawerFoot}>
                <Link className={styles.drawerOwner} href="/owner/login" onClick={() => setDrawerOpen(false)}>
                  ورود مدیر
                </Link>
                {salon?.working_hours_text?.trim() && (
                  <p className={styles.drawerMeta}>{salon.working_hours_text}</p>
                )}
                {salon?.address?.trim() && (
                  <p className={styles.drawerMeta}>{salon.address}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lookbook sheet — the nail-work portfolio experience */}
        {lookbookOpen && (
          <div className={styles.sheetScrim} onClick={() => setLookbookOpen(false)} role="presentation">
            <div
              dir="rtl"
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label={lookbookTitle}
              tabIndex={-1}
              className={styles.sheet}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.sheetHead}>
                <span className={styles.sheetTitle}>{lookbookTitle}</span>
                <button className={styles.iconBtn} aria-label="بستن" onClick={() => setLookbookOpen(false)}>{X_ICON}</button>
              </div>
              <div className={styles.sheetBody}>
                {highlights.length === 0 ? (
                  <p className={styles.sheetEmpty}>هنوز نمونه‌کاری ثبت نشده است.</p>
                ) : (
                  highlights
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((h) => (
                      <Link key={h.id} href={`/book?look=${h.id}`} className={styles.lookCard} onClick={() => setLookbookOpen(false)}>
                        <span className={styles.lookThumb}>
                          {h.cover_url && (
                            // eslint-disable-next-line @next/next/no-img-element -- cover thumbnails inside the Lux sheet
                            <img src={h.cover_url} alt={h.name} loading="lazy" />
                          )}
                        </span>
                        <span className={styles.lookName}>{h.name}</span>
                      </Link>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        <div className={styles.grain} aria-hidden="true" />
      </div>

      {/* Launch splash */}
      {!splashGone && (
        <div className={`${styles.splash} ${ready ? styles.splashExit : ""}`} aria-hidden="true">
          <div>
            <div className={styles.word}>Forehand</div>
            <div className={styles.bar} />
          </div>
        </div>
      )}

      {/* Logout confirmation (old drawer structure) */}
      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="max-w-[300px] rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle>خروج از حساب</AlertDialogTitle>
            <AlertDialogDescription>
              مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟ نوبت‌های شما محفوظ می‌ماند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleLogout}>خروج</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
