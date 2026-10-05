"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface CardAction {
  label: string;
  expanded: boolean;
}

interface CardProps {
  title: string;
  badges: string[];
  action: CardAction;
  image?: ReactNode;
  selected: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/**
 * Generic card — layout mirrors the Figma frame (3:2): text column
 * (title + badge chips + full-width action) beside a square image slot.
 * Knows nothing about services: all copy arrives via props, the image
 * is a caller-supplied slot with a placeholder fallback when empty.
 */
export function ServiceCard({
  title,
  badges,
  action,
  image,
  selected,
  onToggle,
  children,
}: CardProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border bg-card shadow-card ${selected ? "border-primary" : "border-border"}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-expanded={action.expanded}
        className="pressable-soft flex w-full items-center gap-3 p-3 text-start"
      >
        {/* ── Text column ── */}
        <span className="min-w-0 flex-1">
          <b className="block truncate text-base font-medium">{title}</b>
          {badges.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-md border border-border bg-card px-2 py-1 text-[10px] font-light text-foreground"
                >
                  {badge}
                </span>
              ))}
            </span>
          )}
          <span className="mt-3 flex w-full items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-base font-extralight text-primary-foreground">
            <ChevronDown
              className={`h-4 w-4 ${action.expanded ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            {action.label}
          </span>
        </span>
        {/* ── Image slot (fixed square frame, placeholder when empty) ── */}
        <span className="relative aspect-square w-32 shrink-0 overflow-hidden bg-muted">
          {image ?? <span className="block h-full w-full bg-muted" aria-hidden="true" />}
        </span>
      </button>
      {action.expanded && children ? <div className="px-3 pb-3">{children}</div> : null}
    </div>
  );
}

