"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Images } from "lucide-react";
import type { Highlight } from "@/lib/types";
import { useHorizontalDrag } from "@/lib/hooks/use-horizontal-drag";

interface HighlightsProps {
  highlights: Highlight[];
  onSelect: (highlight: Highlight) => void;
}

function HighlightTile({ highlight, featured, onSelect }: { highlight: Highlight; featured: boolean; onSelect: () => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(highlight.cover_url) && !imageFailed;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`qwen-work-card group ${featured ? "qwen-work-card-featured" : ""}`}
      aria-label={`دیدن هایلایت ${highlight.name}`}
    >
      {showImage ? (
        <Image src={highlight.cover_url!} alt={highlight.name} fill unoptimized loading="lazy" decoding="async" sizes={featured ? "190px" : "154px"} className="qwen-work-image object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <div className="qwen-work-fallback" aria-hidden="true"><Images className="h-8 w-8" /><span>{highlight.name.charAt(0)}</span></div>
      )}
      <div className="qwen-work-shade" aria-hidden="true" />
      <div className="qwen-work-caption"><span>{highlight.name}</span><ArrowLeft className="h-4 w-4" aria-hidden="true" /></div>
    </button>
  );
}

export function Highlights({ highlights, onSelect }: HighlightsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { onTouchStart, onTouchMove, onTouchEnd } = useHorizontalDrag(scrollRef);
  if (highlights.length === 0) return null;

  return (
    <section className="qwen-work-section" aria-labelledby="highlights-heading">
      <div className="qwen-section-heading" dir="rtl">
        <div>
          <p className="qwen-section-kicker">برای الهام گرفتن</p>
          <h2 id="highlights-heading">نمونه‌کارها</h2>
        </div>
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </div>
      <div ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="qwen-work-scroll scrollbar-hide" aria-label="نمونه‌کارهای سالن">
        {highlights.map((highlight, index) => <HighlightTile key={highlight.id} highlight={highlight} featured={index === 0} onSelect={() => onSelect(highlight)} />)}
      </div>
    </section>
  );
}
