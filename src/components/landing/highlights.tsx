"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import type { Highlight } from "@/lib/types";
import { useHorizontalDrag } from "@/lib/hooks/use-horizontal-drag";

interface HighlightsProps {
  highlights: Highlight[];
  onSelect: (highlight: Highlight) => void;
}

function HighlightCard({ highlight, featured, onSelect }: { highlight: Highlight; featured: boolean; onSelect: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(highlight.cover_url) && !imageFailed;
  const width = featured ? "w-[168px]" : "w-[118px]";
  const sizes = featured ? "168px" : "118px";

  return (
    <button type="button" onClick={onSelect} className={`home-highlight-card group relative h-[126px] shrink-0 overflow-hidden rounded-[22px] bg-muted text-right shadow-card transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${width}`} aria-label={`دیدن هایلایت ${highlight.name}`}>
      {showImage ? (
        <Image src={highlight.cover_url!} alt={highlight.name} fill unoptimized loading="lazy" decoding="async" sizes={sizes} className="object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setImageFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-end bg-[color:var(--home-blush-light)] p-3 text-[color:var(--home-accent-strong)]"><span className="text-xl font-bold">{highlight.name.charAt(0)}</span></div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-10"><span className="block truncate text-small font-bold text-white">{highlight.name}</span></div>
    </button>
  );
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
            <p className="text-small font-bold tracking-wide text-[color:var(--home-accent-strong)]">از سالن</p>
            <h2 id="highlights-heading" className="mt-1 text-h3 text-foreground">نمونه‌کارها و حال‌وهوای ما</h2>
          </div>
          <ArrowLeft className="mb-1 h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
        </div>
        <div ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }} aria-label="نمونه‌کارهای سالن">
          {highlights.map((highlight, index) => (
            <HighlightCard key={highlight.id} highlight={highlight} featured={index === 0} onSelect={() => onSelect(highlight)} />
          ))}
        </div>
      </div>
    </section>
  );
}
