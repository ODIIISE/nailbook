"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Field } from "@astryxdesign/core/Field";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { TextInput } from "@astryxdesign/core/TextInput";
import { PinInput } from "@/components/booking/pin-input";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { useAuth } from "@/lib/auth-context";
import { getReturnTo, clearReturnTo } from "@/lib/session-expiry";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";

type Step = "phone" | "otp" | "name";

/**
 * Validation message for the active step. Stays a live region (`role="alert"`)
 * so an error is announced the moment it appears, not only on next focus.
 */
function FormError({ message }: { message: string }) {
  return (
    <p className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-destructive" role="alert">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

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
  const returnToRef = useRef<string | null>(null);

  const [otpAttempt, setOtpAttempt] = useState(0);

  const handleOtpSubmit = useCallback(async (enteredCode: string) => {
    setIsLoading(true);
    setError("");
    const result = await verifyOtp(phone, enteredCode);
    setIsLoading(false);

    if (result.success && result.user) {
      // AUDIT-012: an expired session sent the user here mid-task — return
      // them to where they were (bookings list, …) after login completes.
      // New users (no name yet) finish registration first; the destination
      // survives in a ref for the registration-complete navigation.
      returnToRef.current = getReturnTo();
      clearReturnTo();
      verifiedUserRef.current = result.user;
      if (!result.user.name) {
        setStep("name");
      } else {
        router.replace(returnToRef.current || "/?welcome=1");
      }
    } else {
      setError(result.error || "کد نادرست است");
      setOtpAttempt((a) => a + 1); // clear the PIN boxes for the next try
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
        router.replace(returnToRef.current || "/?welcome=1");
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
        <IconButton
          label="بازگشت"
          icon={<Icon icon={ArrowRightIcon} color="inherit" />}
          variant="ghost"
          onClick={goBack}
        />
        <div className="min-w-0 overflow-hidden text-center">
          <span className="block text-xs font-bold text-primary">{kicker}</span>
          <h2 className="truncate text-lg font-bold">{title}</h2>
        </div>
        <span className="h-11 w-11" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-[max(34px,calc(34px+env(safe-area-inset-bottom)))] pt-[clamp(18px,7dvh,64px)]">
        {step === "phone" && (
          <Card padding={5} width="100%">
            <p className="mb-3.5 text-sm font-bold">شماره موبایل خود را وارد کنید</p>
            {/* Stock Field shell + a native control: the phone field needs
                type="tel", inputMode="numeric" and dir="ltr" for Persian number
                entry (TextInput intentionally omits inputMode). */}
            <Field label="شماره موبایل" inputID="login-phone">
              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                dir="ltr"
                className="h-12 w-full rounded-none border border-input bg-card px-3.5 text-left text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handlePhoneSubmit()}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                autoComplete="tel"
                autoFocus
              />
            </Field>
            {error && <FormError message={error} />}
            {/* Enabled while idle so an invalid number explains itself on tap
                (the handler already shows the error) instead of a silently
                dead button — no visible reason = missing state (P5). */}
            <Button
              label="دریافت کد"
              variant="primary"
              isLoading={isLoading}
              onClick={handlePhoneSubmit}
              className="mt-3.5 w-full"
            />
          </Card>
        )}

        {step === "otp" && (
          <Card padding={5} width="100%">
            <p className="mb-3.5 text-sm font-bold">کد ۶ رقمی پیامک‌شده را وارد کنید</p>
            <div className="mb-4 flex items-center gap-3 rounded-none border border-success/25 bg-muted p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">✓</span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm font-bold">شماره</b>
                <small dir="ltr" className="mt-0.5 block text-xs text-muted-foreground">{displayDigits(phone)}</small>
              </span>
            </div>
            <PinInput key={otpAttempt} length={6} onComplete={handleOtpSubmit} disabled={isLoading} />
            {error && <FormError message={error} />}
            <div className="mt-4 flex flex-col items-stretch gap-1.5 border-t border-border pt-3" aria-label="گزینه‌های کد ورود">
              <ResendOtpButton
                onResend={async () => {
                  const result = await sendOtp(normalizeDigits(phone));
                  if (!result.success) setError(result.error || "خطا در ارسال مجدد کد");
                }}
                disabled={isLoading}
              />
              <Button
                label="تغییر شماره"
                variant="ghost"
                size="sm"
                onClick={() => { setStep("phone"); setError(""); }}
                className="w-full"
              />
            </div>
          </Card>
        )}

        {step === "name" && (
          <Card padding={5} width="100%">
            <p className="mb-3.5 text-sm font-bold">نام و نام خانوادگی خود را وارد کنید</p>
            <TextInput
              label="نام و نام خانوادگی"
              value={name}
              onChange={(value) => setName(value)}
              onEnter={handleNameSubmit}
              hasAutoFocus
              autoComplete="name"
              placeholder="مثال: سارا احمدی"
              width="100%"
            />
            {error && <FormError message={error} />}
            <Button
              label="تکمیل ثبت‌نام"
              variant="primary"
              isLoading={isLoading}
              onClick={handleNameSubmit}
              className="mt-3.5 w-full"
            />
          </Card>
        )}
      </div>
    </div>
  );
}
