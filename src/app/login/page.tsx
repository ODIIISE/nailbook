"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/booking/pin-input";
import { useAuth } from "@/lib/auth-context";
import { normalizeDigits } from "@/lib/digits";
import { LogIn } from "lucide-react";

type Step = "phone" | "pin" | "confirm-pin" | "name" | "verify-pin";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, signup } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  // Step 1: Submit phone number
  const handlePhoneSubmit = useCallback(async () => {
    const normalized = normalizeDigits(phone);
    if (normalized.length < 10) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    setIsLoading(true);
    setError("");
    setPhone(normalized);

    // Try login first
    const result = await login(normalized, "");
    setIsLoading(false);

    if (result.needsSignup) {
      // User doesn't exist or has no PIN → go to signup
      setStep("pin");
    } else if (result.success) {
      // Already logged in (shouldn't happen with empty PIN, but handle it)
      router.replace("/");
    } else {
      // User exists with PIN → go to PIN entry
      setStep("verify-pin");
    }
  }, [phone, login, router]);

  // Step 2 (signup): Enter new PIN
  const handlePinSubmit = useCallback((enteredPin: string) => {
    setPin(enteredPin);
    setStep("confirm-pin");
  }, []);

  // Step 3 (signup): Confirm PIN
  const handleConfirmPinSubmit = useCallback((enteredPin: string) => {
    if (pin !== enteredPin) {
      setError("رمزها مطابقت ندارند");
      return;
    }
    setConfirmPin(enteredPin);
    setStep("name");
  }, [pin]);

  // Step 4 (signup): Enter name and complete signup
  const handleNameSubmit = useCallback(async () => {
    if (!name.trim()) {
      setError("نام الزامی است");
      return;
    }
    setIsLoading(true);
    setError("");
    const result = await signup(phone, pin, name.trim());
    setIsLoading(false);

    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error || "خطا در ثبت‌نام");
    }
  }, [phone, pin, name, signup, router]);

  // Step 5 (login): Verify existing PIN
  const handleVerifyPinSubmit = useCallback(async (enteredPin: string) => {
    setIsLoading(true);
    setError("");
    const result = await login(phone, enteredPin);
    setIsLoading(false);

    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error || "کد نادرست است");
    }
  }, [phone, login, router]);

  if (user) return null;

  return (
    <div className="min-h-screen">
      <AppHeader showBack title="ورود" />

      <div className="mx-auto max-w-lg px-4 py-6">
        <Card className="glass p-6">

          {/* Step 1: Phone */}
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
              {error && <p className="text-[13px] text-destructive text-center">{error}</p>}
              <Button className="w-full" onClick={handlePhoneSubmit} disabled={isLoading || phone.length < 10}>
                {isLoading ? "در حال بررسی..." : "ادامه"}
              </Button>
            </div>
          )}

          {/* Step 2 (signup): Create PIN */}
          {step === "pin" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">ساخت رمز</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  یک کد ۴ رقمی برای ورودهای بعدی بسازید
                </p>
              </div>
              <PinInput onComplete={handlePinSubmit} disabled={isLoading} />
              {error && <p className="text-[13px] text-destructive text-center mt-2">{error}</p>}
              <Button variant="ghost" className="w-full" onClick={() => setStep("phone")}>بازگشت</Button>
            </div>
          )}

          {/* Step 3 (signup): Confirm PIN */}
          {step === "confirm-pin" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">تکرار رمز</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  رمز خود را دوباره وارد کنید
                </p>
              </div>
              <PinInput onComplete={handleConfirmPinSubmit} disabled={isLoading} />
              {error && <p className="text-[13px] text-destructive text-center mt-2">{error}</p>}
              <Button variant="ghost" className="w-full" onClick={() => setStep("pin")}>بازگشت</Button>
            </div>
          )}

          {/* Step 4 (signup): Enter name */}
          {step === "name" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">نام شما</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  نام و نام خانوادگی خود را وارد کنید
                </p>
              </div>
              <div>
                <Label className="text-[13px]">نام</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                  placeholder="نام و نام خانوادگی"
                  className="mt-1"
                  autoFocus
                />
              </div>
              {error && <p className="text-[13px] text-destructive text-center">{error}</p>}
              <Button className="w-full" onClick={handleNameSubmit} disabled={isLoading || !name.trim()}>
                {isLoading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setStep("confirm-pin")}>بازگشت</Button>
            </div>
          )}

          {/* Step 5 (login): Enter existing PIN */}
          {step === "verify-pin" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">ورود</h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  رمز ۴ رقمی خود را وارد کنید
                </p>
                <p className="text-[13px] text-muted-foreground mt-1" dir="ltr">{phone}</p>
              </div>
              <PinInput onComplete={handleVerifyPinSubmit} disabled={isLoading} />
              {error && <p className="text-[13px] text-destructive text-center mt-2">{error}</p>}
              <Button variant="ghost" className="w-full" onClick={() => setStep("phone")}>بازگشت</Button>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
