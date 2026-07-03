"use client";

import { Plus } from "lucide-react";
import type { Highlight } from "@/lib/mock-data";

interface HighlightsProps {
  highlights: Highlight[];
  onSelect: (highlight: Highlight) => void;
}

export function Highlights({ highlights, onSelect }: HighlightsProps) {
  if (highlights.length === 0) return null;

  return (
    <div className="px-4 mb-6">
      <div className="mx-auto max-w-lg">
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {highlights.map((highlight) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
