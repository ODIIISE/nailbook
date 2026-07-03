"use client";

import { Scissors, Sparkles, Heart, Star, Palette } from "lucide-react";
import type { Highlight } from "@/lib/mock-data";

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

  return (
    <div className="px-4 mb-6">
      <div className="mx-auto max-w-lg">
        <div className="flex gap-4 justify-center flex-wrap pb-2">
          {hasHighlights
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
              })}
        </div>
      </div>
    </div>
  );
}
