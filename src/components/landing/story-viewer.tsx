"use client";

import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/jalali";
import { compactToman } from "@/lib/pricing";
import type { Highlight, Service, Addon } from "@/lib/types";
import styles from "./lux-home.module.css";

const STORY_MS = 5000;

interface StoryViewerProps {
  highlights: Highlight[];
  services: Service[];
  addons: Addon[];
  index: number;
  onIndexChange: (index: number) => void;
  onBack: () => void;
  onBook: (preset: { serviceId?: string; addonIds?: string[]; lookId?: string }) => void;
}

/* Fullscreen look viewer (v-2 Story): progress segments, tap zones,
   auto-advance, and a one-tap booking preset. Images + copy only — booking
   itself stays in the flow. */
export function StoryViewer({ highlights, services, addons, index, onIndexChange, onBack, onBook }: StoryViewerProps) {
  const [cycle, setCycle] = useState(0);
  const current = highlights[Math.min(Math.max(index, 0), highlights.length - 1)];
  const service = services.find((s) => s.id === current?.service_id);
  const linkedAddons = (current?.addon_ids || [])
    .map((id) => addons.find((a) => a.id === id))
    .filter((a) => Boolean(a) && a!.is_active) as Addon[];
  const totalPrice = (service ? Number(service.price) : 0) + linkedAddons.reduce((sum, a) => sum + Number(a.price), 0);
  const totalDuration = (service ? Number(service.duration_minutes) : 0) + linkedAddons.reduce((sum, a) => sum + Number(a.duration_minutes), 0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => {
      if (index < highlights.length - 1) onIndexChange(index + 1);
      else onBack();
    }, STORY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cycle, highlights.length]);

  if (!current) return null;

  const goBook = () => {
    if (service) onBook({ serviceId: service.id, addonIds: linkedAddons.map((a) => a.id) });
    else onBook({ lookId: current.id });
  };

  return (
    <div className={styles.storyWrap} role="dialog" aria-modal="false" aria-label={current.name}>
      <div className={styles.storyBars} aria-hidden="true">
        {highlights.map((h, i) => (
          <span key={h.id} className={styles.storyBar}>
            {i < index && <span className={styles.storyBarDone} />}
            {i === index && <span key={`${current.id}-${cycle}`} className={styles.storyBarActive} />}
          </span>
        ))}
      </div>
      <div className={styles.storyTop}>
        <button type="button" className={styles.iconBtn} onClick={onBack} aria-label="بازگشت به نمونه‌کارها">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
        <span className={styles.storyCount} dir="ltr">
          {toPersianDigits(index + 1)} / {toPersianDigits(highlights.length)}
        </span>
      </div>
      {current.cover_url && (
        // eslint-disable-next-line @next/next/no-img-element -- story cover inside the Lux sheet
        <img key={current.id} src={current.cover_url} alt={current.name} className={styles.storyImg} draggable={false} />
      )}
      <button type="button" className={styles.storyPrev} onClick={() => { setCycle((c) => c + 1); onIndexChange(Math.max(0, index - 1)); }} aria-label="طرح قبلی" />
      <button
        type="button"
        className={styles.storyNext}
        onClick={() => { setCycle((c) => c + 1); onIndexChange(Math.min(highlights.length - 1, index + 1)); }}
        aria-label="طرح بعدی"
      />
      <div className={styles.storyFoot}>
        <div className={styles.storyTitle}>{current.name}</div>
        {service ? (
          <div className={styles.storyMeta}>
            {service.name} · {toPersianDigits(totalDuration)} دقیقه · {compactToman(totalPrice)}
          </div>
        ) : null}
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={goBook}>
          <span className={styles.btnFa}>{service ? "رزرو این طرح" : "مشاهده در رزرو"}</span>
        </button>
      </div>
    </div>
  );
}
