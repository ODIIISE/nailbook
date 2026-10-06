"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { splitCompactPrice } from "@/lib/pricing";

interface CardAction {
  label: string;
  expanded: boolean;
}

interface CardProps {
  title: string;
  badges: string[];
  /** Base service price in toman — rendered as the glass "از ۷۰۰ هزار تومان" pill. */
  price: number;
  action: CardAction;
  selected: boolean;
  onToggle: () => void;
  children?: ReactNode;
}

/**
 * Glass service card from the dark booking-sheet design: white/10 rounded-36
 * surface, extralight title with hairline chips on the start edge and the
 * soft price pill on the end edge, full-width white/10 "انتخاب" bar with a
 * thin chevron. Selection keeps the primary ring (keyboard/eyeball affordance).
 * Knows nothing about services: all copy arrives via props; prices are typed
 * numbers formatted through the shared pricing helpers.
 */
export function ServiceCard({
  title,
  badges,
  price,
  action,
  selected,
  onToggle,
  children,
}: CardProps) {
  const { amount, unit } = splitCompactPrice(price);
  return (
    <div
      className={`overflow-hidden rounded-[36px] bg-foreground/10 state-fade ${
        selected ? "ring-1 ring-primary" : "ring-1 ring-foreground/10"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        aria-expanded={action.expanded}
        className="pressable-soft flex w-full flex-col items-stretch p-6 text-start"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="min-w-0 flex-1">
            <b className="block truncate text-base font-light leading-5 text-foreground/95">{title}</b>
            {badges.length > 0 && (
              <span className="mt-3 flex flex-wrap gap-2">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="flex h-5 shrink-0 items-center rounded-full border-[0.5px] border-foreground/10 px-3 text-[10px] font-light leading-4 text-foreground/60"
                  >
                    {badge}
                  </span>
                ))}
              </span>
            )}
          </span>
          {/* Price pill — "از ۷۰۰ هزار تومان" (RTL: از starts the phrase) */}
          <span className="flex h-12 shrink-0 items-center gap-1 rounded-full bg-foreground/5 px-4">
            <span className="text-xs font-light leading-4 text-foreground/60">از</span>
            <b className="text-xl font-medium leading-4 text-foreground">{amount}</b>
            {unit && <span className="text-xs font-light leading-4 text-foreground/60">{unit} تومان</span>}
          </span>
        </span>
        <span className="mt-5 flex h-10 w-full items-center justify-center gap-1 rounded-full bg-foreground/10 text-base font-extralight text-foreground">
          {action.label}
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-[var(--duration-micro)] ${
              action.expanded ? "rotate-180" : ""
            }`}
            strokeWidth={1}
            aria-hidden="true"
          />
        </span>
      </button>
      {action.expanded && children ? <div className="px-6 pb-5">{children}</div> : null}
    </div>
  );
}
