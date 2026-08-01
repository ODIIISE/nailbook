"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { normalizeDigits } from "@/lib/digits";

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
}

/**
 * Apply a typed or pasted value starting at a particular PIN cell.
 * Keeping this pure makes the overflow-sensitive input behavior easy to test.
 */
export function applyPinInputValue(
  currentDigits: readonly string[],
  index: number,
  value: string,
  length = currentDigits.length,
): string[] {
  const safeLength = Math.max(1, Math.floor(length));
  const next = Array.from({ length: safeLength }, (_, i) => currentDigits[i] ?? "");
  const normalized = normalizeDigits(value).slice(0, Math.max(0, safeLength - index));

  // Ignore non-numeric keystrokes, but preserve the expected delete behavior.
  if (!normalized && value.length > 0) return next;
  if (!normalized) {
    if (index < safeLength) next[index] = "";
    return next;
  }

  for (const [offset, digit] of normalized.split("").entries()) {
    next[index + offset] = digit;
  }

  return next;
}

export function PinInput({ length = 4, onComplete, disabled }: PinInputProps) {
  const inputLength = Number.isFinite(length) ? Math.max(1, Math.floor(length)) : 4;
  const [digits, setDigits] = useState<string[]>(() => Array(inputLength).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastCompletedPinRef = useRef<string | null>(null);

  useEffect(() => {
    // Keep the component safe if a caller changes the requested PIN length.
    /* eslint-disable react-hooks/set-state-in-effect */
    setDigits((previous) => (
      previous.length === inputLength ? previous : Array(inputLength).fill("")
    ));
    /* eslint-enable react-hooks/set-state-in-effect */
    lastCompletedPinRef.current = null;
    inputRefs.current.length = inputLength;
    inputRefs.current[0]?.focus();
  }, [inputLength]);

  const commitDigits = (nextDigits: string[]) => {
    setDigits(nextDigits);
    const isComplete = nextDigits.length === inputLength && nextDigits.every((digit) => digit !== "");
    const pin = nextDigits.join("");
    if (!isComplete) {
      lastCompletedPinRef.current = null;
    } else if (lastCompletedPinRef.current !== pin) {
      lastCompletedPinRef.current = pin;
      onComplete(pin);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (disabled) return;
    const nextDigits = applyPinInputValue(digits, index, value, inputLength);
    commitDigits(nextDigits);

    const enteredCount = normalizeDigits(value).length;
    if (enteredCount > 0) {
      inputRefs.current[Math.min(index + enteredCount, inputLength - 1)]?.focus();
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
    const pasted = normalizeDigits(e.clipboardData.getData("text"));
    if (!pasted) return;

    const focusedIndex = inputRefs.current.findIndex((input) => input === document.activeElement);
    const startIndex = focusedIndex >= 0 ? focusedIndex : 0;
    const availableDigits = Math.max(0, inputLength - startIndex);
    const value = pasted.slice(0, availableDigits);
    const nextDigits = applyPinInputValue(digits, startIndex, value, inputLength);
    commitDigits(nextDigits);
    inputRefs.current[Math.min(startIndex + value.length, inputLength) - 1]?.focus();
  };

  return (
    <div
      className="grid w-full max-w-full gap-1 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${inputLength}, minmax(0, 1fr))`, direction: "ltr" }}
      dir="ltr"
      role="group"
      aria-label={`ورود کد ${inputLength} رقمی`}
    >
      {Array.from(
        { length: inputLength },
        (_, i) => (digits.length === inputLength ? digits[i] : "") ?? "",
      ).map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          enterKeyHint={i === inputLength - 1 ? "done" : "next"}
          aria-label={`رقم ${i + 1} از ${inputLength}`}
          maxLength={inputLength}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "box-border block h-11 w-full min-w-0 rounded-2xl px-0 text-center text-2xl font-bold transition-all duration-200 sm:h-14",
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
