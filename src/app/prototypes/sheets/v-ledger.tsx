"use client";

import { useState } from "react";
import { SERVICES } from "./data";

/* LEDGER — axis: receipt rows, not cards. No boxes at all: hairline-ruled
   rows, tabular figures right-aligned, selection shown by a gold square
   marker + figure emphasis. The footer splits in two zones: total (gold
   figure) left of a black continue block. */
export default function SheetLedger() {
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState("s2");
  if (!open) {
    return (
      <div className="proto-phone" style={{ display: "grid", placeItems: "center", background: "#000" }}>
        <button className="pv-cta" style={{ width: "auto", background: "#161616", color: "#fff" }} onClick={() => setOpen(true)}>
          باز کردن شیت
        </button>
      </div>
    );
  }
  const current = SERVICES.find((s) => s.id === sel) ?? SERVICES[0];
  return (
    <div className="proto-phone">
      <div className="proto-scrim" />
      <div className="proto-sheet pv-ledger">
        <div className="pv-grab" aria-hidden="true" />
        <div className="pv-head">
          <span className="pv-title">رزرو نوبت</span>
          <button className="pv-x" aria-label="بستن" onClick={() => setOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="pv-body" style={{ paddingTop: 8 }}>
          {SERVICES.map((s, i) => {
            const on = s.id === sel;
            return (
              <button
                key={s.id}
                aria-pressed={on}
                onClick={() => setSel(s.id)}
                style={{
                  display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12,
                  alignItems: "baseline", width: "100%", textAlign: "start",
                  background: "transparent", color: "inherit", cursor: "pointer",
                  border: 0, borderBottom: "1px solid rgba(22,22,22,0.1)",
                  padding: "14px 2px",
                }}
              >
                <span style={{
                  width: 8, height: 8, alignSelf: "center",
                  background: on ? "#a8833f" : "transparent",
                  border: on ? "0" : "1px solid rgba(22,22,22,0.3)",
                  fontSize: 10, fontWeight: 400, opacity: on ? 1 : 0.5,
                  fontVariantNumeric: "tabular-nums",
                }} aria-hidden="true" />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: on ? 500 : 400 }}>
                    <span style={{ opacity: 0.45, marginInlineEnd: 8, fontSize: 11 }}>0{i + 1}</span>
                    {s.name}
                  </span>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 300, opacity: 0.6, marginTop: 3 }}>{s.desc} · {s.minutes}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: on ? 500 : 400, color: on ? "#a8833f" : "inherit", fontVariantNumeric: "tabular-nums" }}>
                  {s.price}
                </span>
              </button>
            );
          })}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 2px 4px", fontSize: 12 }}>
            <span style={{ opacity: 0.6, fontWeight: 400 }}>جمع · {current.minutes}</span>
            <span style={{ fontSize: 14, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>{current.price}</span>
          </div>
        </div>
        <div className="pv-foot" style={{ padding: 0 }}>
          <button className="pv-cta" style={{ minHeight: 60 }} onClick={() => setOpen(false)}>
            <span>ادامه‌ی رزرو</span>
            <span className="pv-cta-meta"><span>{current.price}</span><span aria-hidden="true">·</span><span>{current.minutes}</span></span>
          </button>
        </div>
      </div>
    </div>
  );
}
