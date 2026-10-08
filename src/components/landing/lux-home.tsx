"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useSalon } from "@/lib/salon-context";
import { getNearestAvailableSlot } from "@/lib/slots";
import { gregorianToJalali, formatJalaliDateShort, toPersianDigits } from "@/lib/jalali";
import { useMenu } from "@/components/layout/menu-context";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { BookingFlow } from "@/components/booking/booking-flow";
import { StoryViewer } from "@/components/landing/story-viewer";
import styles from "./lux-home.module.css";

const d = (v: string) => ({ "--d": v }) as CSSProperties;

/* Booking sheet host — mounts the flow per open so every visit starts clean,
 * like any dialog. /book stays reachable by deep-link (?service= / ?look=). */
function BookingSheetHost({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="رزرو نوبت" size="full">
      {open ? <BookingFlow inSheet /> : null}
    </BottomSheet>
  );
}

/* Bundled hero clip; an owner-uploaded video (settings → «ویدیوی پس‌زمینه»)
 * replaces it through salon.hero_video_url. Always played muted — the file
 * itself carries an audio track that must never reach the visitor. */
const FALLBACK_HERO_VIDEO = "/media/forehand-hero.mp4";
/* True first frame of the bundled clip (captured, not chosen): the backdrop
 * and the clip's first painted frame are pixel-identical, so there is no
 * visible cut when playback starts. */
const FALLBACK_HERO_POSTER = "/media/forehand-hero-poster.jpg";
const X_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

export function LuxHome() {
  const router = useRouter();
  const { salon, highlights, services, addons, workingHours, bookings, blockedTimes, specificDaysOff } = useSalon();
  const { openMenu } = useMenu();

  const [ready, setReady] = useState(false);
  const [settled, setSettled] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);
  const [lookbookOpen, setLookbookOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [videoBlocked, setVideoBlocked] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  /* The mounted clip. Starts bundled (already preloading via layout) so the
     hero plays in ~1s without waiting for bootstrap; an owner clip swaps in
     only after a hidden loader proves it can play through. */
  const [clipSrc, setClipSrc] = useState(FALLBACK_HERO_VIDEO);
  const [prevClipSrc, setPrevClipSrc] = useState(clipSrc);
  if (prevClipSrc !== clipSrc) {
    setPrevClipSrc(clipSrc);
    setVideoOn(false);
  }

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Owner media arrives with bootstrap, seconds after first paint. The poster
     follows the owner gallery (crossfade masks the cut); the clip itself only
     swaps once preloaded — never mid-buffer. */
  const ownerVideoSrc = salon?.hero_video_url?.trim() || null;
  const heroPoster =
    salon?.home_gallery_urls?.find((u): u is string => Boolean(u?.trim())) ??
    salon?.hero_image_url ??
    FALLBACK_HERO_POSTER;

  /* Background video lifecycle. Poster-only when the visitor asked for less
   * motion or is on a metered connection — an autoplaying hero is exactly what
   * those two settings exist to suppress. */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const blocked = () => {
      setVideoBlocked(mq.matches || Boolean(conn?.saveData));
    };
    blocked();
    mq.addEventListener("change", blocked);
    return () => mq.removeEventListener("change", blocked);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || videoBlocked) return;

    const play = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      v.play().catch(() => {});
    };
    // The clip starts at first paint, not at idle: every idle-deferred second
    // is a second the visitor stares at a still poster that then visibly cuts.
    play();
    const onVisibility = () => {
      if (document.hidden) v.pause();
      else play();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [videoBlocked, clipSrc]);

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
  /* Haptics (delegated; no-op where unsupported, e.g. iOS Safari) */
  const buzz = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button") && "vibrate" in navigator)
      navigator.vibrate(8);
  };

  const openDrawer = () => {
    openMenu();
  };

  const lookbookTitle = salon?.lookbook_title || "نمونه‌کارها";
  const heroName = salon?.name?.trim() || "Forehand";
  const heroTitle = /nail/i.test(heroName) ? heroName : `${heroName} Nail Studio`;
  const heroTagline =
    salon?.slogan?.trim() ||
    salon?.description?.trim() ||
    "تجربه‌ای آرام و دقیق برای ناخن‌هایی که امضای تو هستند";
  const heroKicker = salon?.homepage_kicker?.trim() || "NAIL · CARE · RITUAL";
  const ctaLabel = salon?.homepage_cta_label?.trim() || "رزرو نوبت";
  const microCopy = salon?.homepage_micro?.trim() || "";
  /* Nearest free slot across active services (v-2 next-chip): display-only
     14-day scan through the same engine the booking flow uses. */
  const nearestSlot = useMemo(() => {
    const active = services.filter((s) => s.is_active);
    if (!active.length) return null;
    const existing = bookings
      .filter((b) => b.status === "reserved" || b.status === "confirmed" || b.status === "in_progress" || b.status === "pending")
      .map((b) => ({ date_gregorian: b.date_gregorian.split("T")[0], start_time: b.start_time, end_time: b.end_time }));
    const locks = blockedTimes.map((l) => ({ date_gregorian: l.date_gregorian.split("T")[0], start_time: l.start_time, end_time: l.end_time }));
    const cfg = {
      proximity_window_hours: salon.proximity_window_hours,
      early_extra_hours: salon.early_extra_hours,
      late_extra_hours: salon.late_extra_hours,
      expand_threshold: salon.expand_threshold,
      allow_overflow: salon.allow_overflow,
      overflow_minutes: salon.overflow_minutes,
      optimization_mode: salon.optimization_mode,
      suggestion_limit: salon.suggestion_limit,
      min_useful_gap_minutes: salon.min_useful_gap_minutes,
    };
    let best: { date: Date; time: string } | null = null;
    for (const svc of active) {
      const r = getNearestAvailableSlot(
        workingHours, Number(svc.duration_minutes), 0,
        salon.slot_interval_minutes, salon.slot_buffer_minutes,
        existing, locks, cfg, specificDaysOff,
      );
      if (r && (!best || r.date.getTime() < best.date.getTime() || (r.date.getTime() === best.date.getTime() && r.time < best.time))) best = r;
    }
    if (!best) return null;
    const j = gregorianToJalali(best.date);
    return { dateLabel: formatJalaliDateShort(j.jy, j.jm, j.jd), timeLabel: toPersianDigits(best.time) };
  }, [services, workingHours, bookings, blockedTimes, specificDaysOff, salon]);
  const instagramUrl = salon?.instagram_handle
    ? `https://instagram.com/${salon.instagram_handle.replace(/^@/, "")}`
    : null;

  return (
    <div
      dir="ltr"
      lang="en"
      data-motion=""
      className={`${styles.viewport} ${ready ? styles.rootReady : ""} ${settled ? styles.settled : ""}`}
      onPointerDown={buzz}
    >
      <div className={styles.app}>
        {/* Background clip — owner video (settings → «ویدیوی پس‌زمینه») with the
            bundled clip as fallback. Muted, no controls: it is decoration, and the
            file's own audio track must never reach the visitor. */}
        <div className={styles.videoLayer} aria-hidden="true">
          {/* Poster paints instantly as a plain image layer; the clip fades in
              over it on first frame — nothing ever pops or vanishes. */}
          {/* eslint-disable-next-line @next/next/no-img-element -- hero poster layer */}
          <img src={heroPoster} alt="" className={styles.heroPoster} fetchPriority="high" decoding="async" draggable={false} />
          {!videoBlocked && (
            <video
              ref={videoRef}
              className={`${styles.heroVideo} ${videoOn ? styles.videoOn : ""}`}
              src={clipSrc}
              muted
              autoPlay
              playsInline
              loop
              preload="auto"
              disablePictureInPicture
              tabIndex={-1}
              onCanPlay={(e) => e.currentTarget.play().catch(() => {})}
              onPlaying={() => setVideoOn(true)}
              onError={() => {
                if (clipSrc !== FALLBACK_HERO_VIDEO) setClipSrc(FALLBACK_HERO_VIDEO);
              }}
            />
          )}
          {/* Hidden owner-clip loader: the mounted clip swaps only after this
              proves the owner file plays through — no mid-buffer blank frame. */}
          {ownerVideoSrc && ownerVideoSrc !== clipSrc && !videoBlocked && (
            <video
              src={ownerVideoSrc}
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
              tabIndex={-1}
              style={{ display: "none" }}
              onCanPlayThrough={() => setClipSrc(ownerVideoSrc)}
            />
          )}
        </div>
        <div className={styles.ambient} aria-hidden="true" />
        {/* Legibility veil — alphas are derived from the clip's own sampled
            frames so the brightest/darkest patch still clears 4.5:1 against the
            ink in both themes. Sits above the vignette, below all content. */}
        <div className={styles.videoScrim} aria-hidden="true" />

        {/* Header — inbox left, wordmark center, menu right */}
        <header className={`${styles.header} ${styles.rv}`} style={d(".1s")}>
          <button className={styles.iconBtn} aria-label="سبد خرید" onClick={() => toast("سبد خرید خالی است")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="m9.2 12.5 2 2 3.8-3.8" /></svg>
          </button>
          <span className={styles.logo} dir="ltr" lang="en">{heroName}</span>
          <span className={styles.r}>
            <button className={styles.iconBtn} aria-label="منو" onClick={openDrawer}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="13" x2="20" y2="13" /><line x1="4" y1="18" x2="12" y2="18" /></svg>
            </button>
          </span>
        </header>

        <main className={styles.scroll}>
          {/* Cinematic caption (v-1 cin-caption): static film framing, not owner data. */}
          <div className={`${styles.cinCaption} ${styles.rv}`} style={d(".12s")} dir="rtl">
            <span lang="fa">یک فیلم کوتاه درباره جزئیات</span>
            <span dir="ltr" lang="en">FOREHAND / VOL. 01</span>
          </div>
          {/* Hero */}
          <section className={styles.hero}>
            <p dir="ltr" lang="en" className={`${styles.script} ${styles.rvBlur}`} style={d(".2s")}>Welcome to</p>
            <h1 dir="ltr" lang="en" className={`${styles.heroTitle} ${styles.rvBlur}`} style={d(".32s")}>{heroTitle}</h1>
            <p dir="ltr" lang="en" className={`${styles.kicker} ${styles.rv}`} style={d(".4s")}>{heroKicker}</p>
            <p dir="rtl" lang="fa" className={`${styles.lede} ${styles.rv}`} style={d(".46s")}>
              {heroTagline}
            </p>

          </section>
        </main>

        {/* CTAs — pinned to the bottom of the device */}
        <footer className={styles.cta}>
          {nearestSlot && (
            <button dir="rtl" type="button" className={`${styles.nextChip} ${styles.rv}`} style={d(".75s")} onClick={() => setBookingOpen(true)} aria-label={`نزدیک‌ترین وقت خالی: ${nearestSlot.dateLabel}، ${nearestSlot.timeLabel}`}>
              <span className={styles.pulse} aria-hidden="true" />
              <span className={styles.nextChipLabel}>نزدیک‌ترین وقت خالی</span>
              <span className={styles.nextChipTime}>{nearestSlot.dateLabel}، {nearestSlot.timeLabel}</span>
            </button>
          )}
          {addrOpen && (
            <div dir="rtl" lang="fa" className={styles.addrCard} role="status">
              <div className={styles.addrText}>
                <span>{salon?.address?.trim() ? salon.address : "آدرس سالن ثبت نشده است"}</span>
                {salon?.working_hours_text?.trim() ? (
                  <span className={styles.addrHours}>{salon.working_hours_text}</span>
                ) : null}
                {salon?.address?.trim() ? (
                  <a
                    className={styles.addrNav}
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address)}`}
                  >
                    مسیریابی
                  </a>
                ) : null}
              </div>
              <button className={styles.addrClose} aria-label="بستن" onClick={closeAddress}>{X_ICON}</button>
            </div>
          )}
          <button dir="rtl" lang="fa" className={`${styles.btn} ${styles.btnPrimary} ${styles.rvPop}`} style={d(".85s")} onClick={() => setBookingOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="m9.2 12.5 2 2 3.8-3.8" /></svg>
            <span className={styles.btnFa}>{ctaLabel}</span>
          </button>
          <button dir="rtl" lang="fa" className={`${styles.btn} ${styles.btnGhost} ${styles.rvPop}`} style={d(".95s")} onClick={() => setLookbookOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3c.7 3.9 2.4 5.6 6.3 6.3-3.9.7-5.6 2.4-6.3 6.3-.7-3.9-2.4-5.6-6.3-6.3C9.6 8.6 11.3 6.9 12 3z" /></svg>
            <span className={styles.btnFa}>نمونه کارها</span>
          </button>
          <div className={styles.contacts}>
            {salon?.phone?.trim() ? (
              <a className={styles.iconBtn} href={`tel:${salon.phone.replace(/\s+/g, "")}`} aria-label="تماس با سالن">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 2z" /></svg>
              </a>
            ) : (
              <button className={styles.iconBtn} aria-label="تماس با سالن" onClick={() => toast("شماره تماس ثبت نشده است")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 2z" /></svg>
              </button>
            )}
            {instagramUrl ? (
              <a className={styles.iconBtn} href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
              </a>
            ) : (
              <button className={styles.iconBtn} aria-label="اینستاگرام" onClick={() => toast("اینستاگرام ثبت نشده است")}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
              </button>
            )}
            <button className={styles.iconBtn} aria-label="آدرس سالن" onClick={showAddress}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            </button>
          </div>
          {microCopy ? (
            <p dir="rtl" lang="fa" className={styles.microLine}>{microCopy}</p>
          ) : null}
          <p dir="ltr" lang="en" className={styles.filmLabel} aria-hidden="true">35mm / IN THE DETAILS</p>

          {/* Bag/menu toast — sits centered just above the footer controls */}
          <div className={`${styles.toast} ${toastShow ? styles.toastShow : ""}`} role="status" aria-live="polite">
            <span className={styles.toastMsg}>{toastMsg}</span>
            <button className={styles.toastClose} aria-label="بستن" onClick={closeToast}>{X_ICON}</button>
          </div>
        </footer>

        {/* Menu drawer — one unified, role-aware menu (menu-context) is
            mounted app-wide in Providers; openDrawer toggles it. */}

        {/* Booking sheet — the full flow, in place, glass. Draft resets on
            close like any dialog; /book stays reachable by deep-link. */}
        <BookingSheetHost open={bookingOpen} onClose={() => setBookingOpen(false)} />

        {/* Lookbook sheet — grid opens the fullscreen story viewer */}
        <BottomSheet open={lookbookOpen} onClose={() => { setLookbookOpen(false); setStoryIndex(null); }} title={lookbookTitle}>
          {storyIndex !== null && highlights[storyIndex] ? (
            <StoryViewer
              highlights={highlights.slice().sort((a, b) => a.sort_order - b.sort_order)}
              services={services}
              addons={addons}
              index={Math.min(storyIndex, highlights.length - 1)}
              onIndexChange={setStoryIndex}
              onBack={() => setStoryIndex(null)}
              onBook={(preset) => {
                setStoryIndex(null);
                setLookbookOpen(false);
                const params = new URLSearchParams();
                if (preset.serviceId) params.set("service", preset.serviceId);
                if (preset.addonIds?.length) params.set("addons", preset.addonIds.join(","));
                if (preset.lookId) params.set("look", preset.lookId);
                router.push(`/book?${params.toString()}`);
              }}
            />
          ) : (
          <div dir="rtl" className={styles.sheetBody}>
            {highlights.length === 0 ? (
              <p className={styles.sheetEmpty}>هنوز نمونه‌کاری ثبت نشده است.</p>
            ) : (
              highlights
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((h, i) => (
                  <button key={h.id} className={styles.lookCard} onClick={() => setStoryIndex(i)} aria-label={`مشاهده ${h.name}`}>
                    <span className={styles.lookThumb}>
                      {h.cover_url && (
                        // eslint-disable-next-line @next/next/no-img-element -- cover thumbnails inside the Lux sheet
                        <img src={h.cover_url} alt={h.name} loading="lazy" />
                      )}
                    </span>
                    <span className={styles.lookName}>{h.name}</span>
                  </button>
                ))
            )}
          </div>
          )}
        </BottomSheet>

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
    </div>
  );
}
