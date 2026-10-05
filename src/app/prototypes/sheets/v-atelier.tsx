"use client";

import { useState } from "react";
import { SERVICES } from "./data";

/* ATELIER — axis: fashion-house air. Oversized thin headline, one featured
   service given a full-bleed moment, the rest whispered in a quiet list.
   Gold only in the eyebrow kicker. CTA is a calm black bar. */
export default function SheetAtelier() {
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
  const rest = SERVICES.filter((s) => s.id !== current.id);
  return (
    <div className="proto-phone">
      <div className="proto-scrim" />
      <div className="proto-sheet pv-atelier">
        <div className="pv-grab" aria-hidden="true" />
        <div className="pv-head" style={{ borderBottom: 0 }}>
          <button className="pv-back" aria-label="بازگشت" onClick={() => setOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button className="pv-x" aria-label="بستن" onClick={() => setOpen(false)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="pv-body" style={{ paddingTop: 0 }}>
          <p className="pv-kicker" style={{ margin: "4px 0 10px" }}>رزرو نوبت · مرحله ۱ از ۳</p>
          <h2 style={{ fontSize: 30, fontWeight: 300, lineHeight: 1.5, margin: "0 0 4px" }}>{current.name}</h2>
          <p style={{ fontSize: 13, fontWeight: 300, opacity: 0.6 }}>{current.desc} · {current.minutes}</p>
          <p style={{ fontSize: 20, fontWeight: 400, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>{current.price}</p>
          <div style={{ borderTop: "1px solid rgba(22,22,22,0.1)", marginTop: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 500, opacity: 0.55, margin: "14px 0 2px" }}>سایر خدمات</p>
            {rest.map((s) => (
              <button
                key={s.id}
                onClick={() => setSel(s.id)}
                style={{
                  display: "flex", width: "100%", justifyContent: "space-between", alignItems: "baseline",
                  background: "transparent", color: "inherit", cursor: "pointer",
                  border: 0, borderBottom: "1px solid rgba(22,22,22,0.1)",
                  padding: "13px 2px", fontSize: 14, fontWeight: 400, textAlign: "start",
                }}
              >
                <span>{s.name}</span>
                <span style={{ fontSize: 12, fontWeight: 300, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{s.price}</span>
              </button>
            ))}
          </div>
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
