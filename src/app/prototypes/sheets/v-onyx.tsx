"use client";

import { useState } from "react";
import { SERVICES } from "./data";

/* ONYX — axis: inverted drama. Black sheet, white hairlines, gold only where
   money or choice lives (price, selected check, progress). CTA is the single
   white block in the room. */
export default function SheetOnyx() {
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState("s2");
  if (!open) {
    return (
      <div className="proto-phone" style={{ display: "grid", placeItems: "center", background: "#000" }}>
        <button className="pv-cta" style={{ width: "auto", background: "#fafafa", color: "#0e0e0e" }} onClick={() => setOpen(true)}>
          باز کردن شیت
        </button>
      </div>
    );
  }
  const current = SERVICES.find((s) => s.id === sel) ?? SERVICES[0];
  return (
    <div className="proto-phone">
      <div className="proto-scrim" />
      <div className="proto-sheet pv-onyx">
        <div className="pv-grab" aria-hidden="true" />
        <div className="pv-head">
          <span className="pv-title">رزرو نوبت</span>
          <button className="pv-x" aria-label="بستن" onClick={() => setOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="pv-prog" aria-hidden="true"><i className="on" /><i /><i /></div>
        <div className="pv-body">
          {SERVICES.map((s) => {
            const on = s.id === sel;
            return (
              <button
                key={s.id}
                aria-pressed={on}
                onClick={() => setSel(s.id)}
                style={{
                  display: "flex", width: "100%", alignItems: "center", gap: 12,
                  padding: "14px 12px", marginBottom: 8, textAlign: "start",
                  background: "transparent", color: "inherit", cursor: "pointer",
                  border: on ? "1px solid #fafafa" : "1px solid rgba(250,250,250,0.14)",
                }}
              >
                <span style={{
                  display: "flex", width: 22, height: 22, alignItems: "center", justifyContent: "center",
                  border: on ? "1px solid #c6a15b" : "1px solid rgba(250,250,250,0.32)",
                  color: "#c6a15b", fontSize: 13,
                }} aria-hidden="true">{on ? "✓" : ""}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 500 }}>{s.name}</span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 300, opacity: 0.6, marginTop: 2 }}>{s.desc} · {s.minutes}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, color: "#c6a15b", fontVariantNumeric: "tabular-nums" }}>{s.price}</span>
              </button>
            );
          })}
        </div>
        <div className="pv-foot">
          <button className="pv-cta" onClick={() => setOpen(false)}>
            <span>ادامه</span>
            <span className="pv-cta-meta"><span>{current.price}</span><span aria-hidden="true">·</span><span>{current.minutes}</span></span>
          </button>
        </div>
      </div>
    </div>
  );
}
