"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/booking/pin-input";
import { AuthCard, AuthCardRoot, AuthError } from "@/components/auth/auth-card";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { useAuth } from "@/lib/auth-context";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";
import { LogIn, User, Smartphone, ArrowRight } from "lucide-react";

type Step = "phone" | "otp" | "name";

export default function LoginPage() {
  const router = useRouter();
  const { user, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const handlePhoneSubmit = useCallback(async () => {
    const normalized = normalizeDigits(phone);
    if (!isValidIranianPhone(normalized)) {
      setError("شماره موبایل معتبر نیست");
      return;
    }

    setIsLoading(true);
    setError("");
    setPhone(normalized);

    const result = await sendOtp(normalized, "customer");
    setIsLoading(false);

    if (result.success) {
      setStep("otp");
    } else {
      setError(result.error || "خطا در ارسال کد");
    }
  }, [phone, sendOtp]);

  const verifiedUserRef = useRef<{ id: string } | null>(null);

  const handleOtpSubmit = useCallback(async (enteredCode: string) => {
    setIsLoading(true);
    setError("");
    const result = await verifyOtp(phone, enteredCode, { roleContext: "customer" });
    setIsLoading(false);

    if (result.success && result.user) {
      verifiedUserRef.current = result.user;
      if (!result.user.name) {
        setStep("name");
      } else {
        router.replace("/?welcome=1");
      }
    } else {
      setError(result.error || "کد نادرست است");
    }
  }, [phone, verifyOtp, router]);

  const handleNameSubmit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("نام الزامی است");
      return;
    }
    const userId = verifiedUserRef.current?.id;
    if (!userId) {
      setError("خطا در شناسایی کاربر");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: trimmedName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.replace("/?welcome=1");
      } else {
        setError(data.error || "خطا در تکمیل ثبت‌نام");
      }
    } catch {
      setError("خطای سرور");
    }
    setIsLoading(false);
  }, [name, router]);

  if (user) return null;

  return (
    <div className="min-h-screen">
      <AppHeader showBack title="ورود" />
      <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <AuthCardRoot className="animate-scale">
          {/* Phone entry */}
          {step === "phone" && (
            <AuthCard
              icon={<Smartphone className="h-6 w-6" />}
              title="ورود"
              subtitle="شماره موبایل خود را وارد کنید"
            >
              <div className="space-y-4">
                <div>
                  <Label className="text-caption text-muted-foreground mb-1.5 block">
                    شماره موبایل
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                    placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                    dir="ltr"
                    className="h-14 text-left text-lg rounded-2xl"
                    autoFocus
                  />
                </div>
                <AuthError error={error} />
                <Button
                  size="xl"
                  className="w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                  onClick={handlePhoneSubmit}
                  disabled={isLoading || !isValidIranianPhone(normalizeDigits(phone))}
                >
                  {isLoading ? "در حال ارسال..." : "دریافت کد"}
                </Button>
              </div>
            </AuthCard>
          )}

          {/* OTP entry */}
          {step === "otp" && (
            <AuthCard
              icon={<LogIn className="h-6 w-6" />}
              title="کد ورود"
              subtitle="کد ۶ رقمی پیامک‌شده را وارد کنید"
            >
              <div className="space-y-5">
                <div className="text-center">
                  <p
                    className="inline-block text-body text-muted-foreground bg-muted/50 px-4 py-1.5 rounded-full"
                    dir="ltr"
                  >
                    {displayDigits(phone)}
                  </p>
                </div>
                <PinInput length={6} onComplete={handleOtpSubmit} disabled={isLoading} />
                <AuthError error={error} />
                <ResendOtpButton
                  onResend={async () => {
                    const result = await sendOtp(normalizeDigits(phone), "customer");
                    if (!result.success) {
                      setError(result.error || "خطا در ارسال مجدد کد");
                    }
                  }}
                  disabled={isLoading}
                />
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setStep("phone"); setError(""); }}
                >
                  <ArrowRight className="h-4 w-4 ml-2" />
                  تغییر شماره
                </Button>
              </div>
            </AuthCard>
          )}

          {/* Name entry for new users */}
          {step === "name" && (
            <AuthCard
              icon={<User className="h-6 w-6" />}
              title="نام شما"
              subtitle="نام و نام خانوادگی خود را وارد کنید"
            >
              <div className="space-y-4">
                <div>
                  <Label className="text-caption text-muted-foreground mb-1.5 block">
                    نام و نام خانوادگی
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                    placeholder="مثال: سارا احمدی"
                    className="h-14 text-lg rounded-2xl"
                    autoFocus
                  />
                </div>
                <AuthError error={error} />
                <Button
                  size="xl"
                  className="w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
                  onClick={handleNameSubmit}
                  disabled={isLoading || !name.trim()}
                >
                  {isLoading ? "در حال ثبت..." : "تکمیل ثبت‌نام"}
                </Button>
              </div>
            </AuthCard>
          )}
        </AuthCardRoot>
      </div>
    </div>
  );
}
