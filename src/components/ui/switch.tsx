"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/* Studio switch (.sw): 52×32 pearl-knob toggle. The knob is the ::after
   element driven by the .on class — no inner span needed. */
function Switch({ checked, onCheckedChange, disabled, className, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("sw", checked && "on", disabled && "cursor-not-allowed opacity-60", className)}
    />
  );
}

export { Switch };
