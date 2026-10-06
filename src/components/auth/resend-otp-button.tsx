"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/hooks/use-countdown";
import { toPersianDigits } from "@/lib/jalali";

interface ResendOtpButtonProps {
  onResend: () => void | Promise<void>;
  disabled?: boolean;
  seconds?: number;
  autoStart?: boolean;
  /** Full-width block button (login pages). Turn off inside flex rows where
   * the shared Button's shrink-0 + w-full pushes siblings out of the viewport. */
  fullWidth?: boolean;
}

export function ResendOtpButton({
  onResend,
  disabled,
  seconds = 120,
  autoStart = true,
  fullWidth = true,
}: ResendOtpButtonProps) {
  const { remaining, start, stop, isActive } = useCountdown({ initialSeconds: seconds });

  useEffect(() => {
    if (autoStart) {
      start();
    }
    return () => stop();
  }, [autoStart, start, stop]);

  const handleClick = async () => {
    if (isActive || disabled) return;
    await onResend();
    start();
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${toPersianDigits(String(m))}:${toPersianDigits(String(s).padStart(2, "0"))}`;
  };

  return (
    <Button
      type="button"
      variant="ghost"
      className={fullWidth ? "w-full" : undefined}
      onClick={handleClick}
      disabled={disabled || isActive}
    >
      {isActive ? (
        <span className="text-muted-foreground">
          ارسال مجدد پس از {formatTime(remaining)}
        </span>
      ) : (
        <span>ارسال مجدد کد</span>
      )}
    </Button>
  );
}
