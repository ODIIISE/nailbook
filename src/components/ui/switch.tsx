"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

function Switch({ checked, onCheckedChange, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      dir="ltr"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        // 52×32 — the 50×30 shell sat below the system's own 44px touch
        // mandate (§12); knob travel animates on the standard motion token.
        "relative inline-flex h-[32px] w-[52px] shrink-0 cursor-pointer items-center rounded-full p-[3px] outline-none border transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] focus-visible:ring-1 focus-visible:ring-ring",
        checked
          ? "bg-foreground border-foreground/20"
          : "bg-secondary border-border",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <span
        className={cn(
          "block h-[26px] w-[26px] rounded-full bg-card transition-transform duration-[var(--duration-micro)] ease-[var(--ease-standard)]",
          checked ? "translate-x-[20px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

export { Switch };
