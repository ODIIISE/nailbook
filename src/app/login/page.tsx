"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { PinInput } from "@/components/booking/pin-input";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { useAuth } from "@/lib/auth-context";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";

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

  const goBack = () => {
    window.dispatchEvent(new Event("nailbook:back"));
    router.push("/");
  };

  const handlePhoneSubmit = useCallback(async () => {
    const normalized = normalizeDigits(phone);
    if (!isValidIranianPhone(normalized)) {
      setError("شماره موبایل معتبر نیست");
      return;
    }

    setIsLoading(true);
    setError("");
    setPhone(normalized);

    const result = await sendOtp(normalized);
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
    const result = await verifyOtp(phone, enteredCode);
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

  const title = step === "phone" ? "ورود" : step === "otp" ? "کد ورود" : "نام شما";
  const kicker = step === "name" ? "ثبت‌نام" : "حساب کاربری";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
      <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3.5 pb-2 pt-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          onClick={goBack}
          aria-label="بازگشت"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 overflow-hidden text-center">
          <span className="block text-xs font-extrabold text-primary">{kicker}</span>
          <h2 className="truncate text-lg font-bold">{title}</h2>
        </div>
        <span className="h-11 w-11" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(34px,calc(34px+env(safe-area-inset-bottom)))] pt-[clamp(18px,7dvh,64px)]">
        {step === "phone" && (
          <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="mb-3.5 text-sm font-extrabold">شماره موبایل خود را وارد کنید</p>
            <div className="mb-3">
              <label htmlFor="login-phone" className="mb-1.5 block text-xs font-bold text-muted-foreground">شماره موبایل</label>
              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                dir="ltr"
                className="h-12 w-full rounded-full border border-input bg-input px-3.5 text-left text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handlePhoneSubmit()}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                autoComplete="tel"
                autoFocus
              />
            </div>
            {error && <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-destructive" role="alert"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
            <button
              type="button"
              className="mt-3.5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50"
              onClick={handlePhoneSubmit}
              disabled={isLoading || !isValidIranianPhone(normalizeDigits(phone))}
            >
              {isLoading ? "در حال ارسال…" : "دریافت کد"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="mb-3.5 text-sm font-extrabold">کد ۶ رقمی پیامک‌شده را وارد کنید</p>
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-success/25 bg-muted p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">✓</span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm font-extrabold">شماره</b>
                <small dir="ltr" className="mt-0.5 block text-xs text-muted-foreground">{displayDigits(phone)}</small>
              </span>
            </div>
            <PinInput length={6} onComplete={handleOtpSubmit} disabled={isLoading} />
            {error && <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-destructive" role="alert"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
            <div className="mt-4 flex flex-col items-stretch gap-1.5 border-t border-border pt-3" aria-label="گزینه‌های کد ورود">
              <ResendOtpButton
                onResend={async () => {
                  const result = await sendOtp(normalizeDigits(phone));
                  if (!result.success) setError(result.error || "خطا در ارسال مجدد کد");
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg text-xs font-extrabold text-primary"
                onClick={() => { setStep("phone"); setError(""); }}
              >
                تغییر شماره
              </button>
            </div>
          </div>
        )}

        {step === "name" && (
          <div className="w-full rounded-2xl border border-border bg-card p-5 shadow-card">
            <p className="mb-3.5 text-sm font-extrabold">نام و نام خانوادگی خود را وارد کنید</p>
            <div className="mb-3">
              <label htmlFor="login-name" className="mb-1.5 block text-xs font-bold text-muted-foreground">نام و نام خانوادگی</label>
              <input
                id="login-name"
                type="text"
                className="h-12 w-full rounded-full border border-input bg-input px-3.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleNameSubmit()}
                placeholder="مثال: سارا احمدی"
                autoComplete="name"
                autoFocus
              />
            </div>
            {error && <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-destructive" role="alert"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
            <button
              type="button"
              className="mt-3.5 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50"
              onClick={handleNameSubmit}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? "در حال ثبت…" : "تکمیل ثبت‌نام"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
