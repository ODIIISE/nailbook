"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import "./prototype.css";
import "./picker.css";
import SheetOnyx from "./v-onyx";
import SheetPorcelain from "./v-porcelain";
import SheetLedger from "./v-ledger";
import SheetAtelier from "./v-atelier";
import SheetTuxedo from "./v-tuxedo";

const VARIANTS = ["Onyx", "Porcelain", "Ledger", "Atelier", "Tuxedo"] as const;
const PANELS = [SheetOnyx, SheetPorcelain, SheetLedger, SheetAtelier, SheetTuxedo];

export default function SheetsHarness() {
  const searchParams = useSearchParams();
  const initial = Math.min(
    Math.max(parseInt(searchParams.get("v") ?? "1", 10) || 1, 1),
    VARIANTS.length,
  ) - 1;
  const [current, setCurrent] = useState(initial);
  const [nonce, setNonce] = useState(0);
  const pickerRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveHighlight = useCallback(() => {
    const el = itemRefs.current[current];
    const hl = highlightRef.current;
    if (!el || !hl) return;
    hl.style.width = `${el.offsetWidth}px`;
    hl.style.transform = `translateX(${el.offsetLeft}px)`;
  }, [current]);

  useEffect(() => {
    moveHighlight();
  }, [moveHighlight]);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        pickerRef.current?.setAttribute("data-ready", "");
      }),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onResize = () => moveHighlight();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [moveHighlight]);

  const setActive = useCallback(
    (i: number) => {
      if (i < 0 || i >= VARIANTS.length) return;
      setCurrent(i);
      setNonce((n) => n + 1);
      const url = new URL(window.location.href);
      url.searchParams.set("v", String(i + 1));
      window.history.replaceState(null, "", url);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= VARIANTS.length) setActive(num - 1);
      else if (e.key === "ArrowRight") setActive((current + 1) % VARIANTS.length);
      else if (e.key === "ArrowLeft") setActive((current - 1 + VARIANTS.length) % VARIANTS.length);
      else if (e.key === "r" || e.key === "R") setNonce((n) => n + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, setActive]);

  const Panel = PANELS[current];

  return (
    <div dir="rtl" lang="fa">
      <div className="proto-stage" key={`${current}-${nonce}`}>
        <Panel />
      </div>
      <nav
        ref={pickerRef}
        className="proto-picker"
        data-position="top"
        aria-label="Prototype variants"
      >
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {VARIANTS.map((name, i) => (
          <button
            key={name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className="proto-picker-item"
            {...(i === current
              ? { "data-active": "", "aria-current": "true" as const }
              : {})}
            onClick={() => setActive(i)}
          >
            {name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={() => setNonce((n) => n + 1)}
        >
          ↻
        </button>
      </nav>
    </div>
  );
}
