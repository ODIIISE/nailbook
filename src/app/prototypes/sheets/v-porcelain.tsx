"use client";

import { useState } from "react";
import { SERVICES } from "./data";

/* PORCELAIN — axis: outline minimalism. White sheet, transparent cards with
   hairline black borders, no fills anywhere except the CTA. Gold appears once
   (popular tag) plus the progress bar. Selection = thicker-feeling black edge
   via double hairline, never a fill. */
export default function SheetPorcelain() {
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
      <div className="proto-sheet pv-porcelain">
        <div className="pv-grab" aria-hidden="true" />
        <div className="pv-head">
          <span className="pv-title">رزرو نوبت</span>
          <button className="pv-x" aria-label="بستن" onClick={() => setOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="pv-prog" aria-hidden="true"><i className="on" /><i /><i /></div>
        <div className="pv-body">
          <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.14em", opacity: 0.55, margin: "2px 0 10px" }}>انتخاب خدمت</p>
          {SERVICES.map((s) => {
            const on = s.id === sel;
            return (
              <button
                key={s.id}
                aria-pressed={on}
                onClick={() => setSel(s.id)}
                style={{
                  display: "flex", width: "100%", alignItems: "baseline", gap: 10,
                  padding: "13px 2px", marginBottom: 2, textAlign: "start",
                  background: "transparent", color: "inherit", cursor: "pointer",
                  border: 0, borderBottom: "1px solid rgba(22,22,22,0.12)",
                  outline: on ? "1px solid #161616" : "1px solid transparent",
                  outlineOffset: -1,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: on ? 500 : 400 }}>
                    {s.name}
                    {s.popular && <span className="pv-chip" style={{ borderColor: "#a8833f", color: "#a8833f" }}>پرطرفدار</span>}
                  </span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 300, opacity: 0.6, marginTop: 3 }}>{s.desc}</span>
                </span>
                <span style={{ textAlign: "end", fontVariantNumeric: "tabular-nums" }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 500 }}>{s.price}</span>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 300, opacity: 0.6, marginTop: 2 }}>{s.minutes}</span>
                </span>
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
