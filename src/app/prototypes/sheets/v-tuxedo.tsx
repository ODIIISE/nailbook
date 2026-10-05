"use client";

import { useState } from "react";
import { SERVICES } from "./data";

/* TUXEDO — axis: split composition. Black header band and black footer band
   hold the white sheet body between them. On black: white text, gold time.
   The continue control is a white block inside the black footer. */
export default function SheetTuxedo() {
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
      <div className="proto-sheet pv-tuxedo">
        <div className="pv-band">
          <div className="pv-grab" aria-hidden="true" style={{ opacity: 0.35 }} />
          <div className="pv-head" style={{ borderBottom: 0 }}>
            <span className="pv-title">رزرو نوبت</span>
            <button className="pv-x" aria-label="بستن" onClick={() => setOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          <div className="pv-prog" aria-hidden="true" style={{ paddingBottom: 12 }}><i className="on" /><i /><i /></div>
        </div>
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
                  padding: "13px 12px", marginBottom: 8, textAlign: "start",
                  background: on ? "#0e0e0e" : "transparent",
                  color: on ? "#fafafa" : "inherit", cursor: "pointer",
                  border: on ? "1px solid #0e0e0e" : "1px solid rgba(22,22,22,0.12)",
                }}
              >
                <span style={{
                  display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center",
                  border: on ? "1px solid #c6a15b" : "1px solid rgba(22,22,22,0.3)",
                  color: "#c6a15b", fontSize: 12,
                }} aria-hidden="true">{on ? "✓" : ""}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: on ? 500 : 400 }}>{s.name}</span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 300, opacity: 0.6, marginTop: 2 }}>{s.desc} · {s.minutes}</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums", color: on ? "#c6a15b" : "inherit" }}>{s.price}</span>
              </button>
            );
          })}
        </div>
        <div className="pv-band" style={{ padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))" }}>
          <button className="pv-cta" onClick={() => setOpen(false)}>
            <span>ادامه</span>
            <span className="pv-cta-meta">
              <span style={{ color: "#0e0e0e" }}>{current.price}</span>
              <span aria-hidden="true" style={{ color: "#c6a15b" }}>·</span>
              <span style={{ color: "#c6a15b" }}>{current.minutes}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
