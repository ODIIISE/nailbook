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
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-[52px] shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-colors duration-150 outline-none",
        checked ? "bg-primary" : "bg-muted",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span
        className={cn(
          "block h-[22px] w-[22px] rounded-full bg-white shadow-md transition-transform duration-150",
          checked ? "translate-x-[-25px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

export { Switch };
