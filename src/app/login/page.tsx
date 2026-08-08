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
    <div className="qbf-page">
      <header className="qbf-head">
        <button type="button" className="qbf-round-btn" onClick={goBack} aria-label="بازگشت">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="qbf-mid">
          <span className="qbf-kicker">{kicker}</span>
          <h2 className="qbf-title">{title}</h2>
        </div>
        <span className="qbf-head-spacer" />
      </header>

      <div className="qbp-body qbp-auth-body">
        {step === "phone" && (
          <div className="qbf-form-card">
            <p className="qbf-form-t">شماره موبایل خود را وارد کنید</p>
            <div className="qbf-field">
              <label htmlFor="login-phone">شماره موبایل</label>
              <input
                id="login-phone"
                type="tel"
                inputMode="numeric"
                className="qbf-inp ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handlePhoneSubmit()}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                autoComplete="tel"
                autoFocus
              />
            </div>
            {error && <p className="qbf-form-error" role="alert" style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
            <button
              type="button"
              className="qbf-otp-send"
              onClick={handlePhoneSubmit}
              disabled={isLoading || !isValidIranianPhone(normalizeDigits(phone))}
              style={{ marginTop: 14 }}
            >
              {isLoading ? "در حال ارسال…" : "دریافت کد"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="qbf-form-card qbp-auth-card">
            <p className="qbf-form-t">کد ۶ رقمی پیامک‌شده را وارد کنید</p>
            <div className="qbf-verified-row">
              <span className="qbf-verified-ic">✓</span>
              <span><b>شماره</b><small dir="ltr">{displayDigits(phone)}</small></span>
            </div>
            <PinInput className="qbf-pin-input" length={6} onComplete={handleOtpSubmit} disabled={isLoading} />
            {error && <p className="qbf-form-error" role="alert" style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
            <div className="qbf-otp-actions" aria-label="گزینه‌های کد ورود">
              <ResendOtpButton
                onResend={async () => {
                  const result = await sendOtp(normalizeDigits(phone));
                  if (!result.success) setError(result.error || "خطا در ارسال مجدد کد");
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                className="qbf-otp-change"
                onClick={() => { setStep("phone"); setError(""); }}
              >
                تغییر شماره
              </button>
            </div>
          </div>
        )}

        {step === "name" && (
          <div className="qbf-form-card">
            <p className="qbf-form-t">نام و نام خانوادگی خود را وارد کنید</p>
            <div className="qbf-field">
              <label htmlFor="login-name">نام و نام خانوادگی</label>
              <input
                id="login-name"
                type="text"
                className="qbf-inp"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && handleNameSubmit()}
                placeholder="مثال: سارا احمدی"
                autoComplete="name"
                autoFocus
              />
            </div>
            {error && <p className="qbf-form-error" role="alert" style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
            <button
              type="button"
              className="qbf-otp-send"
              onClick={handleNameSubmit}
              disabled={isLoading || !name.trim()}
              style={{ marginTop: 14 }}
            >
              {isLoading ? "در حال ثبت…" : "تکمیل ثبت‌نام"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
