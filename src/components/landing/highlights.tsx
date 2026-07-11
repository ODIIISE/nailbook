"use client";

import { useEffect, useRef, useCallback } from "react";
import { Scissors, Sparkles, Heart, Star, Palette } from "lucide-react";
import type { Highlight } from "@/lib/types";

interface HighlightsProps {
  highlights: Highlight[];
  onSelect: (highlight: Highlight) => void;
}

const PLACEHOLDER_ITEMS = [
  { icon: Scissors, label: "نمونه کار" },
  { icon: Sparkles, label: "طراحی" },
  { icon: Heart, label: "محبوب‌ها" },
  { icon: Star, label: "ویژه" },
  { icon: Palette, label: "رنگ‌ها" },
];

export function Highlights({ highlights, onSelect }: HighlightsProps) {
  const hasHighlights = highlights.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Native wheel handler for horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Touch drag handlers
  const touchStartY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isDragging.current = true;
    startX.current = e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
    touchStartY.current = e.touches[0].pageY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const x = e.touches[0].pageX - (scrollRef.current?.offsetLeft || 0);
    const y = e.touches[0].pageY;
    const deltaX = Math.abs(x - startX.current);
    const deltaY = Math.abs(y - touchStartY.current);
    if (deltaX > deltaY) {
      e.preventDefault();
      const walk = (x - startX.current) * 1.5;
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const items = hasHighlights
    ? highlights.map((highlight) => (
        <button
          key={highlight.id}
          onClick={() => onSelect(highlight)}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="relative">
            <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-tr from-rose-400 via-amber-400 to-purple-400">
              <div className="w-full h-full rounded-full overflow-hidden bg-background p-[2px]">
                {highlight.cover_url ? (
                  <img
                    src={highlight.cover_url}
                    alt={highlight.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold text-muted-foreground">
                      {highlight.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-foreground font-medium max-w-[72px] truncate">
            {highlight.name}
          </span>
        </button>
      ))
    : PLACEHOLDER_ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <div
            key={`placeholder-${i}`}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-gradient-to-tr from-black/10 via-black/5 to-black/10">
              <div className="w-full h-full rounded-full bg-muted/60 flex items-center justify-center">
                <Icon className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground/60 font-medium max-w-[72px] truncate">
              {item.label}
            </span>
          </div>
        );
      });

  return (
    <div className="px-4 pt-4 mb-6">
      <div className="mx-auto max-w-lg">
        <div
          ref={scrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {items}
        </div>
      </div>
    </div>
  );
}
