"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
}

export function PinInput({ length = 4, onComplete, disabled }: PinInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (disabled) return;
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      onComplete(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted.length === length) {
      const newDigits = pasted.split("");
      setDigits(newDigits);
      inputRefs.current[length - 1]?.focus();
      onComplete(pasted);
    }
  };

  return (
    <div className="flex justify-center gap-1 sm:gap-3 max-w-full" dir="ltr">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "aspect-square flex-1 min-h-11 min-w-11 sm:min-h-14 sm:min-w-14 max-w-[44px] sm:max-w-[64px] rounded-2xl text-center text-2xl font-bold transition-all duration-200",
            "bg-background border-2 outline-none",
            "focus:border-primary focus:ring-4 focus:ring-primary/10",
            digit
              ? "border-primary bg-primary/[0.03] text-foreground shadow-sm"
              : "border-border text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
      ))}
    </div>
  );
}
