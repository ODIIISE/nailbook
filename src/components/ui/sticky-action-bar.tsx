"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface StickyActionBarProps {
  children: ReactNode;
  /** Offset above the bottom navbar. Defaults to 72px (56px navbar + 16px gap). */
  bottomOffset?: number;
}

/**
 * StickyActionBar — persistent bottom action area shown above the AppNavbar.
 *
 * Used to keep the primary CTA in the thumb zone across every booking step
 * (addons, datetime, confirm) so the pattern stays consistent. The gradient
 * scrim keeps content readable as it scrolls beneath the bar.
 */
export function StickyActionBar({ children, bottomOffset = 72 }: StickyActionBarProps) {
  return (
    <div
      className="fixed left-0 right-0 z-30 px-4 pb-2 pointer-events-none"
      style={{ bottom: bottomOffset }}
    >
      <div
        className="mx-auto max-w-lg pointer-events-auto"
        style={{
          background: "linear-gradient(to top, var(--background) 55%, transparent)",
          paddingTop: 12,
          borderRadius: 16,
          marginTop: -12,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Standard full-width primary CTA used inside a StickyActionBar. */
export function StickyPrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      size="xl"
      className="w-full bg-foreground text-background hover:bg-foreground/90 shadow-lg"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
