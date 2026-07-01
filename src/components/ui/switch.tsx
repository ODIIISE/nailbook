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
        "relative inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full p-[3px] transition-all duration-200 outline-none border",
        checked
          ? "bg-foreground border-foreground/20"
          : "bg-gray-200 border-gray-300",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span
        className={cn(
          "block h-[24px] w-[24px] rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[20px]" : "translate-x-0"
        )}
      />
    </button>
  );
}

export { Switch };
