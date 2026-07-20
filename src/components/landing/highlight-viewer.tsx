"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Highlight } from "@/lib/types";

interface HighlightViewerProps {
  highlight: Highlight;
  onClose: () => void;
}

const AUTO_ADVANCE_MS = 10000;

export function HighlightViewer({ highlight, onClose }: HighlightViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const images = highlight.images;
  const total = images.length;

  const goNext = useCallback(() => {
    setCurrentIndex((i) => {
      if (i < total - 1) return i + 1;
      onClose();
      return i;
    });
    elapsedRef.current = 0;
    setProgressPct(0);
  }, [total, onClose]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
    elapsedRef.current = 0;
    setProgressPct(0);
  }, []);

  // Focus trap + restore previous focus on close
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    containerRef.current?.focus();

    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  // Trap focus inside the viewer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = container.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleFocusTrap);
    return () => container.removeEventListener("keydown", handleFocusTrap);
  }, []);

  // Auto-advance timer
  useEffect(() => {
    if (total === 0) return;

    if (isPaused) return;

    const remaining = AUTO_ADVANCE_MS - elapsedRef.current;
    startTimeRef.current = performance.now();

    timerRef.current = setTimeout(() => {
      goNext();
    }, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, total, goNext, isPaused]);

  // Progress bar via rAF
  useEffect(() => {
    if (isPaused || total === 0) return;

    let raf: number;
    const tick = () => {
      const now = performance.now();
      const dt = now - startTimeRef.current;
      elapsedRef.current = pausedAtRef.current + dt;
      const pct = Math.min((elapsedRef.current / AUTO_ADVANCE_MS) * 100, 100);
      setProgressPct(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [currentIndex, total, isPaused]);

  // Pause handlers
  const handlePause = useCallback(() => {
    setIsPaused(true);
    pausedAtRef.current = elapsedRef.current;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      // RTL: ArrowLeft = next (forward), ArrowRight = prev (backward)
      if (e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === " ") goNext();
      if (e.key === "ArrowRight" || e.key === "ArrowUp") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  if (total === 0) return null;

  const image = images[currentIndex];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`هایلایت ${highlight.name}`}
      tabIndex={-1}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3 pt-4">
        {images.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width:
                  i < currentIndex
                    ? "100%"
                    : i === currentIndex
                      ? `${progressPct}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-8 start-4 z-30 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
        aria-label="بستن"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Image */}
      <img
        src={image.image_url}
        alt={highlight.name}
        className="max-h-full max-w-full object-contain select-none"
        draggable={false}
      />

      {/* Navigation tap zones + pause-on-touch */}
      <button
        onClick={goNext}
        onMouseDown={handlePause}
        onMouseUp={handleResume}
        onMouseLeave={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
        className="absolute start-0 top-16 bottom-0 w-1/3 z-10"
        aria-label="بعدی"
      />
      <button
        onClick={goPrev}
        onMouseDown={handlePause}
        onMouseUp={handleResume}
        onMouseLeave={handleResume}
        onTouchStart={handlePause}
        onTouchEnd={handleResume}
        className="absolute end-0 top-16 bottom-0 w-2/3 z-10"
        aria-label="قبلی"
      />

      {/* Arrow buttons (desktop) — RTL: prev on right, next on left */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute end-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hidden md:block"
          aria-label="قبلی"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      {currentIndex < total - 1 && (
        <button
          onClick={goNext}
          className="absolute start-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hidden md:block"
          aria-label="بعدی"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Highlight name */}
      <div className="absolute bottom-6 left-0 right-0 z-20 text-center">
        <span className="text-white text-sm font-medium bg-black/30 px-3 py-1 rounded-full">
          {highlight.name} · {currentIndex + 1}/{total}
        </span>
      </div>
    </div>
  );
}
