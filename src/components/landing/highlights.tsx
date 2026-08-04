"use client";

import { useRef } from "react";
import Image from "next/image";
import { Scissors, Sparkles, Heart, Star, Palette, ArrowLeft } from "lucide-react";
import type { Highlight } from "@/lib/types";
import { useHorizontalDrag } from "@/lib/hooks/use-horizontal-drag";

interface HighlightsProps {
  highlights: Highlight[];
  onSelect: (highlight: Highlight) => void;
}

const PLACEHOLDER_ITEMS = [
  { icon: Scissors, label: "نمونه‌کار" },
  { icon: Sparkles, label: "طراحی" },
  { icon: Heart, label: "محبوب‌ها" },
  { icon: Star, label: "ویژه" },
  { icon: Palette, label: "رنگ‌ها" },
];

export function Highlights({ highlights, onSelect }: HighlightsProps) {
  const hasHighlights = highlights.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { onTouchStart, onTouchMove, onTouchEnd } = useHorizontalDrag(scrollRef);

  return (
    <section className="px-4 py-3" aria-labelledby="highlights-heading">
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-center justify-between px-1" dir="rtl">
          <div>
            <p className="text-small font-bold tracking-wide text-[color:var(--home-accent-strong)]">دنیای فورهند</p>
            <h2 id="highlights-heading" className="mt-1 text-h3 text-foreground">برای الهام گرفتن</h2>
          </div>
          <ArrowLeft className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
        </div>
        <div
          ref={scrollRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
          aria-label="نمونه‌کارها"
        >
          {hasHighlights
            ? highlights.map((highlight) => (
                <button
                  key={highlight.id}
                  type="button"
                  onClick={() => onSelect(highlight)}
                  className="group flex shrink-0 flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  aria-label={`دیدن هایلایت ${highlight.name}`}
                >
                  <div className="relative h-[76px] w-[76px] rounded-[24px] bg-[color:var(--home-accent)] p-[2px] shadow-card transition-shadow duration-200 group-hover:shadow-elevated">
                    <div className="relative h-full w-full overflow-hidden rounded-[22px] border-2 border-card bg-muted">
                      {highlight.cover_url ? (
                        <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized loading="lazy" decoding="async" sizes="76px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[color:var(--home-blush-light)] text-[color:var(--home-accent-strong)]">
                          <span className="text-lg font-bold">{highlight.name.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="max-w-[82px] truncate text-small font-medium text-foreground">{highlight.name}</span>
                </button>
              ))
            : PLACEHOLDER_ITEMS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={`placeholder-${i}`} className="flex shrink-0 flex-col items-center gap-2 px-1 py-1">
                    <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[24px] border border-dashed border-[color:var(--home-border-strong)] bg-[color:var(--home-blush-light)] text-[color:var(--home-accent-strong)]/50">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="max-w-[82px] truncate text-small font-medium text-muted-foreground/70">{item.label}</span>
                  </div>
                );
              })}
        </div>
      </div>
    </section>
  );
}
