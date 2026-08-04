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
    <section className="px-4 py-4" aria-labelledby="highlights-heading">
      <div className="mx-auto max-w-lg">
        <div className="mb-3 flex items-end justify-between px-1" dir="rtl">
          <div>
            <p className="text-small font-bold tracking-wide text-[color:var(--home-accent-strong)]">نمونه‌کارها</p>
            <h2 id="highlights-heading" className="mt-1 text-h3 text-foreground">دنیای فورهند</h2>
          </div>
          <ArrowLeft className="mb-1 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
        </div>
        <div ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }} aria-label="نمونه‌کارهای سالن">
          {highlights.map((highlight, index) => (
            <button key={highlight.id} type="button" onClick={() => onSelect(highlight)} className={`group relative h-[112px] shrink-0 overflow-hidden rounded-[18px] border border-border bg-muted text-right shadow-card transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${index === 0 ? "w-[154px]" : "w-[112px]"}`} aria-label={`دیدن هایلایت ${highlight.name}`}>
              {highlight.cover_url ? (
                <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized loading="lazy" decoding="async" sizes={index === 0 ? "154px" : "112px"} className="object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-end bg-muted p-3 text-foreground"><span className="text-xl font-bold">{highlight.name.charAt(0)}</span></div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8"><span className="block truncate text-small font-bold text-white">{highlight.name}</span></div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
