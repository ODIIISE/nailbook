"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toPersianDigits } from "@/lib/jalali";

interface OtpVerifyProps {
  phone: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  isLoading?: boolean;
  error?: string;
}

export function OtpVerify({ phone, onVerify, onResend, isLoading, error }: OtpVerifyProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== "")) {
      onVerify(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const maskedPhone = phone.slice(0, 4) + " *** " + phone.slice(-2);

  return (
    <Card className="mx-auto max-w-lg p-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-foreground mb-2">تایید شماره موبایل</h3>
        <p className="text-sm text-muted-foreground">
          کد تایید به {maskedPhone} ارسال شد
        </p>
      </div>

      <div className="flex justify-center gap-3 mb-6" dir="ltr">
        {digits.map((digit, i) => (
          <Input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-14 w-14 text-center text-xl font-bold"
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-sm text-destructive mb-4">{error}</p>
      )}

      <Button
        onClick={() => onVerify(digits.join(""))}
        className="w-full bg-rose hover:bg-rose/90 text-white"
        disabled={isLoading || digits.some((d) => !d)}
      >
        {isLoading ? "در حال تایید..." : "تایید"}
      </Button>

      <div className="mt-4 text-center">
        {countdown > 0 ? (
          <p className="text-sm text-muted-foreground">
            ارسال مجدد کد ({toPersianDigits(countdown)})
          </p>
        ) : (
          <Button
            variant="link"
            onClick={() => {
              setCountdown(60);
              onResend();
            }}
            className="text-rose"
          >
            ارسال مجدد کد
          </Button>
        )}
      </div>
    </Card>
  );
}
