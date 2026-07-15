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
import { toast } from "sonner";

type Step = "phone" | "verify-pin" | "create-pin" | "confirm-pin" | "name";

export default function LoginPage() {
  const router = useRouter();
  const { user, checkPhone, login, signup } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  // Step 1: Submit phone → check if exists
  const handlePhoneSubmit = useCallback(async () => {
    const normalized = normalizeDigits(phone);
    if (normalized.length < 10) { setError("شماره موبایل معتبر نیست"); return; }

    setIsLoading(true);
    setError("");
    setPhone(normalized);

    const result = await checkPhone(normalized);
    setIsLoading(false);

    if (result.exists && result.hasPin) {
      // User exists with PIN → ask for PIN
      setStep("verify-pin");
    } else {
      // User doesn't exist, or exists without PIN → create PIN
      setStep("create-pin");
    }
  }, [phone, checkPhone]);

  // Step 2a (login): Enter PIN → verify
  const handleVerifyPin = useCallback(async (enteredPin: string) => {
    setIsLoading(true);
    setError("");
    const result = await login(phone, enteredPin);
    setIsLoading(false);
    if (result.success) {
      router.replace("/?welcome=1");
    } else {
      setError(result.error || "کد نادرست است");
    }
  }, [phone, login, router]);

  // Step 2b (signup): Create PIN
  const handleCreatePin = useCallback((enteredPin: string) => {
    setPin(enteredPin);
    setStep("confirm-pin");
  }, []);

  // Step 3 (signup): Confirm PIN
  const handleConfirmPin = useCallback((enteredPin: string) => {
    if (pin !== enteredPin) { setError("رمزها مطابقت ندارند"); return; }
    setStep("name");
  }, [pin]);

  // Step 4 (signup): Enter name → complete signup
  const handleNameSubmit = useCallback(async () => {
    if (!nameValue.trim()) { setError("نام الزامی است"); return; }

    setIsLoading(true);
    setError("");
    const result = await signup(phone, pin, nameValue.trim());
    setIsLoading(false);
    if (result.success) {
      router.replace(`/?welcome=1&name=${encodeURIComponent(nameValue.trim())}`);
    } else setError(result.error || "خطا در ثبت‌نام");
  }, [phone, pin, nameValue, signup, router]);

  if (user) return null;

  return (
    <div className="min-h-screen">
      <AppHeader showBack title="ورود" />
      <div className="mx-auto max-w-lg px-4 py-6">
        <Card className="glass p-6">

          {/* Phone entry */}
          {step === "phone" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <div className="h-14 w-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <LogIn className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-h2 text-foreground">ورود</h2>
                <p className="text-[13px] text-muted-foreground mt-1">شماره موبایل خود را وارد کنید</p>
              </div>
              <div>
                <Label className="text-[13px]">شماره موبایل</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷" dir="ltr" className="mt-1 text-left" />
              </div>
              {error && <p className="text-[13px] text-destructive text-center">{error}</p>}
              <Button className="w-full" onClick={handlePhoneSubmit} disabled={isLoading || phone.length < 10}>
                {isLoading ? "در حال بررسی..." : "ادامه"}
              </Button>
            </div>
          )}

          {/* Enter existing PIN (login) */}
          {step === "verify-pin" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">ورود</h2>
                <p className="text-[13px] text-muted-foreground mt-1">رمز ۴ رقمی خود را وارد کنید</p>
                <p className="text-[13px] text-muted-foreground mt-1" dir="ltr">{phone}</p>
              </div>
              <PinInput onComplete={handleVerifyPin} disabled={isLoading} />
              {error && <p className="text-[13px] text-destructive text-center mt-2">{error}</p>}
              <Button variant="ghost" className="w-full" onClick={() => { setStep("phone"); setError(""); }}>بازگشت</Button>
            </div>
          )}

          {/* Create new PIN (signup) */}
          {step === "create-pin" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">ساخت رمز</h2>
                <p className="text-[13px] text-muted-foreground mt-1">یک کد ۴ رقمی برای ورودهای بعدی بسازید</p>
              </div>
              <PinInput onComplete={handleCreatePin} disabled={isLoading} />
              {error && <p className="text-[13px] text-destructive text-center mt-2">{error}</p>}
              <Button variant="ghost" className="w-full" onClick={() => { setStep("phone"); setError(""); }}>بازگشت</Button>
            </div>
          )}

          {/* Confirm PIN (signup) */}
          {step === "confirm-pin" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">تکرار رمز</h2>
                <p className="text-[13px] text-muted-foreground mt-1">رمز خود را دوباره وارد کنید</p>
              </div>
              <PinInput onComplete={handleConfirmPin} disabled={isLoading} />
              {error && <p className="text-[13px] text-destructive text-center mt-2">{error}</p>}
              <Button variant="ghost" className="w-full" onClick={() => { setStep("create-pin"); setError(""); }}>بازگشت</Button>
            </div>
          )}

          {/* Enter name (signup) */}
          {step === "name" && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-h1 text-foreground">نام شما</h2>
                <p className="text-[13px] text-muted-foreground mt-1">نام و نام خانوادگی خود را وارد کنید</p>
              </div>
              <div>
                <Label className="text-[13px]">نام</Label>
                <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)}
                  placeholder="نام و نام خانوادگی" className="mt-1" autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()} />
              </div>
              {error && <p className="text-[13px] text-destructive text-center">{error}</p>}
              <Button className="w-full" onClick={handleNameSubmit} disabled={isLoading}>
                {isLoading ? "در حال ثبت‌نام..." : "ثبت‌نام"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => { setStep("confirm-pin"); setError(""); }}>بازگشت</Button>
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}
