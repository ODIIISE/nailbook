"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import styles from "./lux-home.module.css";

const d = (v: string) => ({ "--d": v }) as CSSProperties;

export function LuxHome() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [splashGone, setSplashGone] = useState(false);
  const [imgOn, setImgOn] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastShow, setToastShow] = useState(false);

  const scrollRef = useRef<HTMLElement | null>(null);
  const parRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Splash → choreography (load + fallback) */
  useEffect(() => {
    const boot = () => {
      setReady(true);
      setTimeout(() => setSplashGone(true), 750);
    };
    const fallback = setTimeout(boot, 2800);
    const delay = document.readyState === "complete" ? 500 : 1500;
    const t = setTimeout(boot, delay);
    return () => {
      clearTimeout(t);
      clearTimeout(fallback);
    };
  }, []);

  /* Image settle-in (covers cached images that never fire onLoad) */
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setImgOn(true);
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

  /* Toast feedback */
  const toast = (m: string) => {
    setToastMsg(m);
    setToastShow(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastShow(false), 2100);
  };

  /* Haptics (delegated; no-op where unsupported, e.g. iOS Safari) */
  const buzz = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button") && "vibrate" in navigator)
      navigator.vibrate(8);
  };

  return (
    <div
      dir="ltr"
      lang="en"
      className={`${styles.viewport} ${ready ? styles.rootReady : ""}`}
      onPointerDown={buzz}
    >
      <div className={styles.app}>
        <div className={styles.ambient} aria-hidden="true" />

        {/* Header — bag top-left, wordmark center, menu top-right */}
        <header className={styles.header + " " + styles.rv} style={d(".1s")}>
          <button className={styles.iconBtn} aria-label="Bag" onClick={() => toast("🤍 Your bag is empty")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="m9.2 12.5 2 2 3.8-3.8" /></svg>
          </button>
          <span className={styles.logo}>Forehand</span>
          <span className={styles.r}>
            <button className={styles.iconBtn} aria-label="Menu" onClick={() => toast("✦ Full menu coming soon")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="4" y1="8" x2="20" y2="8" /><line x1="4" y1="13" x2="20" y2="13" /><line x1="4" y1="18" x2="12" y2="18" /></svg>
            </button>
          </span>
        </header>

        <main className={styles.scroll} ref={scrollRef}>
          {/* Hero */}
          <section className={styles.hero}>
            <p className={styles.script + " " + styles.rvBlur} style={d(".2s")}>Welcome to</p>
            <h1 className={styles.heroTitle + " " + styles.rvBlur} style={d(".32s")}>Forehand Nail Studio</h1>
            <p dir="rtl" lang="fa" className={styles.lede + " " + styles.rv} style={d(".46s")}>
              تجربه‌ای آرام و دقیق برای ناخن‌هایی که امضای تو هستند
            </p>

            <figure className={styles.media + " " + styles.rvBlur} style={d(".6s")}>
              <div className={styles.parallax} ref={parRef}>
                <div className={styles.tilt} ref={tiltRef}>
                  <div className={styles.frame}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- mock fidelity: plain img with breathe/opacity choreography */}
                    <img
                      ref={imgRef}
                      width={600}
                      height={450}
                      fetchPriority="high"
                      src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&h=600&q=85"
                      alt="Beauty portrait — hand with manicure resting near the face"
                      className={imgOn ? "on" : undefined}
                      onLoad={() => setImgOn(true)}
                    />
                  </div>
                  {/* Rotating badge */}
                  <div className={styles.badge} ref={badgeRef}>
                    <div className={styles.badgeFloat}>
                      <svg className={styles.ring} viewBox="0 0 100 100" aria-hidden="true">
                        <circle cx="50" cy="50" r="49" fill="#e8e0d5" />
                        <path id="ringPath" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" fill="none" />
                        <text><textPath href="#ringPath">SHOP THE COLLECTION • SHOP THE COLLECTION •</textPath></text>
                      </svg>
                      <button className={styles.badgeCore} aria-label="Shop the collection" onClick={() => toast("🛍️ Collection preview soon")}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 6 15 12 9 18" /></svg>
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
          <button dir="rtl" className={`${styles.btn} ${styles.btnPrimary} ${styles.rvPop}`} style={d(".85s")} onClick={() => router.push("/book")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="m9.2 12.5 2 2 3.8-3.8" /></svg>
            <span className={styles.btnFa}>رزرو نوبت</span>
          </button>
          <button dir="rtl" className={`${styles.btn} ${styles.btnGhost} ${styles.rvPop}`} style={d(".95s")} onClick={() => router.push("/book")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M12 3c.7 3.9 2.4 5.6 6.3 6.3-3.9.7-5.6 2.4-6.3 6.3-.7-3.9-2.4-5.6-6.3-6.3C9.6 8.6 11.3 6.9 12 3z" /></svg>
            <span className={styles.btnFa}>مشاهده خدمات</span>
          </button>
          <div className={styles.contacts}>
            <button className={styles.iconBtn} aria-label="Call the salon" onClick={() => toast("📞 Calling the salon…")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 2z" /></svg>
            </button>
            <button className={styles.iconBtn} aria-label="Instagram" onClick={() => toast("📸 Instagram — coming soon")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
            </button>
            <button className={styles.iconBtn} aria-label="Location" onClick={() => toast("📍 Location — coming soon")}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            </button>
          </div>
        </footer>

        <div className={styles.grain} aria-hidden="true" />
        <div className={`${styles.toast} ${toastShow ? styles.toastShow : ""}`} role="status" aria-live="polite">
          {toastMsg}
        </div>
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
