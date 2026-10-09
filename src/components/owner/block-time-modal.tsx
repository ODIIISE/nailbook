"use client";

import { useState, useMemo } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { getIranWeekDay } from "@/lib/slots";
import type { WorkingHours } from "@/lib/slots";
import { gregorianToJalali, toPersianDigits, PERSIAN_MONTHS } from "@/lib/jalali";
import { getTehranDateKey, parseGregorianDateKey } from "@/lib/time";

interface BlockTimeModalProps {
  date: Date;
  workingHours: WorkingHours;
  /** Optional free-text reason (persisted on migration-027 databases). */
  onBlock: (date_gregorian: string, startTime: string, endTime: string, reason: string) => void;
  onCancel: () => void;
}

export function BlockTimeModal({ date, workingHours, onBlock, onCancel }: BlockTimeModalProps) {
  /* Date picker (v-2 block drawer): block any of the next 45 days, not just
     the timeline's selected day. */
  const dayOptions = useMemo(() => {
    const base = parseGregorianDateKey(getTehranDateKey(date));
    return Array.from({ length: 45 }, (_, i) => {
      const d = new Date(base.getTime() + i * 864e5);
      const key = getTehranDateKey(d);
      const j = gregorianToJalali(d);
      return { key, label: `${toPersianDigits(j.jd)} ${PERSIAN_MONTHS[j.jm - 1]}` };
    });
  }, [date]);
  const [dateKey, setDateKey] = useState(() => getTehranDateKey(date));
  const defaultTimes = useMemo(() => {
    const dayKey = getIranWeekDay(parseGregorianDateKey(dateKey));
    const dayHours = workingHours[dayKey];
    if (dayHours) {
      // Default to midpoint of working hours
      const [openH, openM] = dayHours.open.split(":").map(Number);
      const [closeH, closeM] = dayHours.close.split(":").map(Number);
      const openMin = openH * 60 + openM;
      const closeMin = closeH * 60 + closeM;
      const midMin = Math.floor((openMin + closeMin) / 2);
      const midH = Math.floor(midMin / 60);
      const midM = midMin % 60;
      const endMin = midMin + 60;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      return {
        start: `${String(midH).padStart(2, "0")}:${String(midM).padStart(2, "0")}`,
        end: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
      };
    }
    return { start: "12:00", end: "13:00" };
  }, [dateKey, workingHours]);

  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);
  const [reason, setReason] = useState("");
  const [timeError, setTimeError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) return;
    if (endTime <= startTime) {
      setTimeError("ساعت پایان باید بعد از ساعت شروع باشد");
      return;
    }
    setTimeError("");
    onBlock(dateKey, startTime, endTime, reason.trim());
  };

  const handleDateChange = (key: string) => {
    setDateKey(key);
    // Reset to the new day's midpoint defaults (same rule as initial state).
    const dayHours = workingHours[getIranWeekDay(parseGregorianDateKey(key))];
    if (dayHours) {
      const [openH, openM] = dayHours.open.split(":").map(Number);
      const [closeH, closeM] = dayHours.close.split(":").map(Number);
      const midMin = Math.floor(((openH * 60 + openM) + (closeH * 60 + closeM)) / 2);
      setStartTime(`${String(Math.floor(midMin / 60)).padStart(2, "0")}:${String(midMin % 60).padStart(2, "0")}`);
      const endMin = midMin + 60;
      setEndTime(`${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`);
    } else {
      setStartTime("12:00");
      setEndTime("13:00");
    }
    setTimeError("");
  };

  return (
    <BottomSheet open={true} onClose={onCancel} title="مسدود کردن زمان">
      <form onSubmit={handleSubmit}>
        <label className="field">
          <span>روز</span>
          <select
            className="input"
            value={dateKey}
            onChange={(e) => handleDateChange(e.target.value)}
          >
            {dayOptions.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
        </label>
        <div className="row" style={{ gap: 10, marginTop: 14 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>از ساعت</span>
            <input
              className="input ltr"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{ textAlign: "center" }}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>تا ساعت</span>
            <input
              className="input ltr"
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setTimeError("");
              }}
              style={{ textAlign: "center" }}
              aria-invalid={Boolean(timeError)}
            />
          </label>
        </div>
        {timeError && <p className="t-s" style={{ color: "var(--wine-hi)", marginTop: 8 }} role="alert">{timeError}</p>}
        <label className="field" style={{ marginTop: 14 }}>
          <span>دلیل (اختیاری)</span>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثلاً جلسه، مرخصی، تعمیرات"
            maxLength={100}
          />
        </label>
        <div className="row" style={{ gap: 10, marginTop: 18 }}>
          <button type="submit" className="btn pri" style={{ flex: 1 }}>
            مسدود کن
          </button>
          <button type="button" className="btn gl" style={{ flex: 1 }} onClick={onCancel}>
            انصراف
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
