"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/booking/pin-input";
import { useAuth } from "@/lib/auth-context";
import { normalizeDigits } from "@/lib/digits";
import { LogIn } from "lucide-react";

type AuthStep = "phone" | "pin" | "confirm-pin" | "verify-pin";

export default function LoginPage() {
  const router = useRouter();
  const { user, checkPhone, createPin, verifyPin } = useAuth();

  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect home
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handlePhoneSubmit = useCallback(async () => {
    const normalized = normalizeDigits(phone);
    if (normalized.length < 10) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    setIsLoading(true);
    setError("");
    setPhone(normalized);
    const result = await checkPhone(normalized);
    setIsLoading(false);

    if (result.locked) {
      setError(result.message || "حساب قفل شده است");
      return;
    }

    if (result.exists && result.hasPin) {
      setStep("verify-pin");
    } else {
      setStep("pin");
    }
  }, [phone, checkPhone]);

  const handlePinSubmit = useCallback((enteredPin: string) => {
    setPin(enteredPin);
    setStep("confirm-pin");
  }, []);

  const handleConfirmPinSubmit = useCallback(async (confirmPin: string) => {
    if (pin !== confirmPin) {
      setError("رمزها مطابقت ندارند");
      return;
    }
    setIsLoading(true);
    setError("");
    const result = await createPin(normalizeDigits(phone), pin, "");
    setIsLoading(false);

    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error || "خطا در ثبت‌نام");
    }
  }, [pin, phone, createPin, router]);

  const handleVerifyPinSubmit = useCallback(async (enteredPin: string) => {
    setIsLoading(true);
    setError("");
    const result = await verifyPin(normalizeDigits(phone), enteredPin);
    setIsLoading(false);

    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error || "کد نادرست است");
    }
  }, [phone, verifyPin, router]);

  // Don't render if already logged in
  if (user) return null;

  return (
    <div className="min-h-screen">
      <Header showBack title="ورود" />

      <div className="mx-auto max-w-lg px-4 py-6">
        <Card className="glass p-6">
          {step === "phone" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-h2 text-foreground">ورود</h2>
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

          {step === "pin" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">ساخت رمز</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  یک کد ۴ رقمی برای ورودهای بعدی بسازید
                </p>
              </div>
              <PinInput onComplete={handlePinSubmit} disabled={isLoading} />
              {error && (
                <p className="text-[13px] text-destructive text-center mt-2">{error}</p>
              )}
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
              <PinInput onComplete={handleConfirmPinSubmit} disabled={isLoading} />
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
              <PinInput onComplete={handleVerifyPinSubmit} disabled={isLoading} />
              {error && (
                <p className="text-[13px] text-destructive text-center mt-2">{error}</p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
