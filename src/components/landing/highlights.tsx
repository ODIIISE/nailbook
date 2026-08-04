"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Highlight } from "@/lib/types";
import { useHorizontalDrag } from "@/lib/hooks/use-horizontal-drag";

interface HighlightsProps {
  highlights: Highlight[];
  onSelect: (highlight: Highlight) => void;
}

export function Highlights({ highlights, onSelect }: HighlightsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { onTouchStart, onTouchMove, onTouchEnd } = useHorizontalDrag(scrollRef);

  if (highlights.length === 0) return null;

  return (
    <section className="px-4 pb-4 pt-2" aria-labelledby="highlights-heading">
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between px-1" dir="rtl">
          <div>
            <p className="text-small font-bold tracking-wide text-[color:var(--home-accent-strong)]">نمونه‌کارها</p>
            <h2 id="highlights-heading" className="mt-1 text-h3 text-foreground">برای الهام گرفتن</h2>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
        </div>
        <div
          ref={scrollRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
          aria-label="نمونه‌کارهای سالن"
        >
          {highlights.map((highlight) => (
            <button
              key={highlight.id}
              type="button"
              onClick={() => onSelect(highlight)}
              className="group flex shrink-0 flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              aria-label={`دیدن هایلایت ${highlight.name}`}
            >
              <div className="relative h-[68px] w-[68px] overflow-hidden rounded-[18px] border border-[color:var(--home-border-strong)] bg-muted shadow-card transition-shadow duration-200 group-hover:shadow-elevated">
                {highlight.cover_url ? (
                  <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized loading="lazy" decoding="async" sizes="68px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground"><span className="text-lg font-bold">{highlight.name.charAt(0)}</span></div>
                )}
              </div>
              <span className="max-w-[78px] truncate text-small font-medium text-foreground">{highlight.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
