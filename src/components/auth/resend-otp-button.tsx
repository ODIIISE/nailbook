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
}

export function ResendOtpButton({
  onResend,
  disabled,
  seconds = 120,
  autoStart = true,
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
      className="w-full"
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
