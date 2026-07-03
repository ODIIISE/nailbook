"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Highlight } from "@/lib/mock-data";

interface HighlightViewerProps {
  highlight: Highlight;
  onClose: () => void;
}

const AUTO_ADVANCE_MS = 10000;

export function HighlightViewer({ highlight, onClose }: HighlightViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const images = highlight.images;
  const total = images.length;

  const goNext = useCallback(() => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, total, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Auto-advance timer
  useEffect(() => {
    if (total === 0) return;

    const interval = 50;
    let elapsed = 0;

    timerRef.current = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / AUTO_ADVANCE_MS) * 100);
      if (elapsed >= AUTO_ADVANCE_MS) {
        clearInterval(timerRef.current!);
        goNext();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, total, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") goNext();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  if (total === 0) return null;

  const image = images[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
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
                      ? `${progress}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Close button — above everything */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-8 right-4 z-30 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
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

      {/* Navigation tap zones — below close button */}
      <button
        onClick={goNext}
        className="absolute left-0 top-16 bottom-0 w-1/3 z-10"
        aria-label="Next"
      />
      <button
        onClick={goPrev}
        className="absolute right-0 top-16 bottom-0 w-2/3 z-10"
        aria-label="Previous"
      />

      {/* Arrow buttons (desktop) */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hidden md:block"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
      {currentIndex < total - 1 && (
        <button
          onClick={goNext}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hidden md:block"
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
