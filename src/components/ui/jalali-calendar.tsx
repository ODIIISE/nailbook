"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  getJalaliMonthName,
  toPersianDigits,
} from "@/lib/jalali";
import { getTehranDateKey, parseGregorianDateKey } from "@/lib/time";

const WEEKDAY_INITIALS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

/** Saturday-first weekday index (sat=0 … fri=6) for a Gregorian ISO date. */
function iranWeekday(iso: string): number {
  return (parseGregorianDateKey(iso).getUTCDay() + 1) % 7;
}

function isoOf(y: number, m: number, d: number): string {
  return getTehranDateKey(jalaliToGregorian(y, m, d));
}

interface JalaliCalendarProps {
  value: string | null;
  onChange: (iso: string) => void;
  today: string;
  disabled?: (iso: string) => boolean;
  /** Extra day class: "off" (closed, wine) etc. */
  mark?: (iso: string) => string | null;
  /** Gold availability dot. */
  dots?: (iso: string) => boolean;
}

export function JalaliCalendar({ value, onChange, today, disabled = () => false, mark = () => null, dots = () => false }: JalaliCalendarProps) {
  const initial = gregorianToJalali(parseGregorianDateKey(value || today));
  const [ym, setYm] = useState({ y: initial.jy, m: initial.jm });
  const [dir, setDir] = useState(0);
  const [prevValue, setPrevValue] = useState(value);

  // Render-adjust (never setState-in-effect): an externally changed value
  // re-aims the visible month during render.
  if (prevValue !== value) {
    setPrevValue(value);
    if (value) {
      const j = gregorianToJalali(parseGregorianDateKey(value));
      setYm({ y: j.jy, m: j.jm });
    }
  }

  const move = (d: number) => {
    setDir(d);
    setYm(({ y, m }) => {
      let mm = m + d;
      let yy = y;
      if (mm > 12) {
        mm = 1;
        yy++;
      }
      if (mm < 1) {
        mm = 12;
        yy--;
      }
      return { y: yy, m: mm };
    });
  };

  const firstIso = isoOf(ym.y, ym.m, 1);
  const leadBlanks = iranWeekday(firstIso);
  const monthLen = getJalaliMonthDays(ym.y, ym.m);
  const todayJ = gregorianToJalali(parseGregorianDateKey(today));
  const canGoBack = ym.y > todayJ.jy || (ym.y === todayJ.jy && ym.m > todayJ.jm);

  const cells = useMemo(
    () => [...Array<string | null>(leadBlanks).fill(null),
      ...Array.from({ length: monthLen }, (_, i) => isoOf(ym.y, ym.m, i + 1))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ym.y, ym.m]
  );

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 200 }}>
          {getJalaliMonthName(ym.m)} <span className="faint">{toPersianDigits(ym.y)}</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className="iconbtn bare"
            aria-label="ماه قبل"
            disabled={!canGoBack}
            style={{ opacity: canGoBack ? 1 : 0.25 }}
            onClick={() => move(-1)}
          >
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
          <button type="button" className="iconbtn bare" aria-label="ماه بعد" onClick={() => move(1)}>
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div className="cal">
        {WEEKDAY_INITIALS.map((d) => (
          <div key={d} className="dow">{d}</div>
        ))}
      </div>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            className="cal"
            key={`${ym.y}-${ym.m}`}
            custom={dir}
            initial={{ opacity: 0, x: dir * -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
          >
            {cells.map((iso, i) =>
              iso === null ? (
                <span key={`e${i}`} />
              ) : (
                <button
                  key={iso}
                  type="button"
                  className={`day ${iso === value ? "sel" : ""} ${iso === today ? "today" : ""} ${mark(iso) || ""}`}
                  disabled={disabled(iso)}
                  aria-pressed={iso === value}
                  aria-label={iso}
                  onClick={() => onChange(iso)}
                >
                  {toPersianDigits(gregorianToJalali(parseGregorianDateKey(iso)).jd)}
                  {dots(iso) && iso !== value && (
                    <i style={{ position: "absolute", top: 6, left: 9, width: 4, height: 4, borderRadius: 4, background: "var(--gold)" }} />
                  )}
                </button>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
