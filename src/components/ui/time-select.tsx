"use client";

import type { CSSProperties } from "react";
import { toPersianDigits } from "@/lib/jalali";

/* 15-minute grid from 06:00 — matches the engine resolution options. */
const GRID: string[] = Array.from({ length: 72 }, (_, i) => {
  const mins = 360 + i * 15;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  style?: CSSProperties;
  bare?: boolean;
}

export function TimeSelect({ value, onChange, label, style, bare }: TimeSelectProps) {
  const options = GRID.includes(value) ? GRID : [value, ...GRID];
  return (
    <select
      className="timein"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: "none",
        cursor: "pointer",
        ...(bare ? { border: 0, background: "transparent", width: 64, minHeight: 34, padding: 0 } : {}),
        ...style,
      }}
    >
      {options.map((t) => (
        <option key={t} value={t} style={{ background: "#1c1714" }}>
          {toPersianDigits(t)}
        </option>
      ))}
    </select>
  );
}
