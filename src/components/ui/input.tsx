import * as React from "react"
import { cn } from "@/lib/utils"
import { normalizeDigits, displayDigits } from "@/lib/digits"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  displayFarsi?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, displayFarsi, onChange, value, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (displayFarsi && onChange) {
        const normalized = normalizeDigits(e.target.value);
        e.target.value = normalized;
      }
      onChange?.(e);
    };

    const displayValue = displayFarsi && typeof value === "string"
      ? displayDigits(value)
      : value;

    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[12px] glass px-3.5 py-2 text-[14px] placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 transition-shadow duration-180",
          className
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Input.displayName = "Input"

export { Input }
