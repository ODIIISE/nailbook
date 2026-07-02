"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "./pin-input";
import { useAuth } from "@/lib/auth-context";
import { toPersianDigits } from "@/lib/jalali";

interface AuthFlowProps {
  onComplete: () => void;
}

export function AuthFlow({ onComplete }: AuthFlowProps) {
  const { checkPhone, createPin, verifyPin } = useAuth();
  const [step, setStep] = useState<"phone" | "create-pin" | "confirm-pin" | "verify-pin" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = async () => {
    if (phone.length < 10) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    setIsLoading(true);
    setError("");
    const result = await checkPhone(phone);
    setIsLoading(false);

    if (result.locked) {
      setError(result.message || "حساب قفل شده است");
      return;
    }

    if (result.exists && result.hasPin) {
      setStep("verify-pin");
    } else if (result.exists) {
      setStep("create-pin");
    } else {
      setStep("name");
    }
  };

  const handleNameSubmit = () => {
    if (!name.trim()) {
      setError("نام الزامی است");
      return;
    }
    setStep("create-pin");
  };

  const handleCreatePin = (enteredPin: string) => {
    setPin(enteredPin);
    setStep("confirm-pin");
  };

  const handleConfirmPin = async (confirmPin: string) => {
    if (pin !== confirmPin) {
      setError("رمزها مطابقت ندارند");
      return;
    }
    setIsLoading(true);
    setError("");
    const result = await createPin(phone, pin, name);
    setIsLoading(false);

    if (result.success) {
      onComplete();
    } else {
      setError(result.error || "خطا در ثبت‌نام");
    }
  };

  const handleVerifyPin = async (verifyPinCode: string) => {
    setIsLoading(true);
    setError("");
    const result = await verifyPin(phone, verifyPinCode);
    setIsLoading(false);

    if (result.success) {
      onComplete();
    } else {
      setError(result.error || "کد نادرست است");
      if (result.attemptsLeft !== undefined) {
        setAttemptsLeft(result.attemptsLeft);
      }
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Card className="p-6 glass rounded-3xl animate-scale">
        {step === "phone" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-h1 text-foreground">ورود</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                شماره موبایل خود را وارد کنید
              </p>
            </div>

            <div>
              <Label className="text-[13px]">شماره موبایل</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                dir="ltr"
                className="mt-1 text-left"
              />
            </div>

            {error && (
              <p className="text-[13px] text-destructive text-center">{error}</p>
            )}

            <Button
              className="w-full"
              onClick={handlePhoneSubmit}
              disabled={isLoading || phone.length < 10}
            >
              {isLoading ? "در حال بررسی..." : "ادامه"}
            </Button>
          </div>
        )}

        {step === "name" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-h1 text-foreground">نام شما</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                نام خود را برای پروفایل وارد کنید
              </p>
            </div>

            <div>
              <Label className="text-[13px]">نام و نام خانوادگی</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                placeholder="نام خود را وارد کنید"
                className="mt-1"
              />
            </div>

            {error && (
              <p className="text-[13px] text-destructive text-center">{error}</p>
            )}

            <Button
              className="w-full"
              onClick={handleNameSubmit}
              disabled={!name.trim()}
            >
              ادامه
            </Button>
          </div>
        )}

        {step === "create-pin" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-h1 text-foreground">ساخت رمز</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                یک کد ۴ رقمی برای ورودهای بعدی بسازید
              </p>
            </div>

            <PinInput onComplete={handleCreatePin} disabled={isLoading} />

            {error && (
              <p className="text-[13px] text-destructive text-center mt-2">{error}</p>
            )}

            <p className="text-[11px] text-muted-foreground text-center">
              این کد برای ورودهای بعدی استفاده می‌شود
            </p>
          </div>
        )}

        {step === "confirm-pin" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-h1 text-foreground">تکرار رمز</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                رمز خود را دوباره وارد کنید
              </p>
            </div>

            <PinInput onComplete={handleConfirmPin} disabled={isLoading} />

            {error && (
              <p className="text-[13px] text-destructive text-center mt-2">{error}</p>
            )}
          </div>
        )}

        {step === "verify-pin" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-h1 text-foreground">ورود</h2>
              <p className="text-[13px] text-muted-foreground mt-1">
                کد ۴ رقمی عضویت خود را وارد کنید
              </p>
              <p className="text-[13px] text-muted-foreground mt-1" dir="ltr">
                {phone}
              </p>
            </div>

            <PinInput onComplete={handleVerifyPin} disabled={isLoading} />

            {error && (
              <p className="text-[13px] text-destructive text-center mt-2">{error}</p>
            )}

            {attemptsLeft < 5 && (
              <p className="text-[11px] text-muted-foreground text-center">
                {toPersianDigits(attemptsLeft)} تلاش باقی‌مانده
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
