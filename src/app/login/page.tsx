"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle } from "lucide-react";
import { PinInput } from "@/components/booking/pin-input";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { useAuth } from "@/lib/auth-context";
import { getReturnTo, clearReturnTo } from "@/lib/session-expiry";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";

type Step = "phone" | "otp" | "name";

function FormError({ message }: { message: string }) {
  return (
    <p className="t-s" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#eaa0ad" }} role="alert">
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
      // them to where they were after login completes.
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

  const title = step === "phone" ? "شماره موبایل‌تان" : step === "otp" ? "کد تأیید" : "خوش آمدید";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
      <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3 pb-2 pt-3">
        <button type="button" className="iconbtn" onClick={goBack} aria-label="بازگشت">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <h2 className="h-m truncate text-center">{title}</h2>
        <span className="h-11 w-11" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
        {step === "phone" && (
          <div style={{ paddingTop: 12 }}>
            <p className="t-s" style={{ marginBottom: 20 }}>برای ثبت و پیگیری نوبت. کد تأیید پیامک می‌شود.</p>
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && void handlePhoneSubmit()}
              placeholder="۰۹۱۲ ۰۰۰ ۰۰۰۰"
              autoComplete="tel"
              autoFocus
              aria-label="شماره موبایل"
              style={{ direction: "ltr", textAlign: "center", fontSize: 22, letterSpacing: ".08em", minHeight: 64 }}
            />
            {error && <FormError message={error} />}
            <button type="button" className="btn pri block" style={{ marginTop: 20 }} disabled={isLoading} onClick={() => void handlePhoneSubmit()}>
              {isLoading ? "..." : "ادامه"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div style={{ paddingTop: 8, textAlign: "center" }}>
            <p className="t-s" style={{ marginBottom: 20 }}>
              کد ۶ رقمی پیامک‌شده به <span className="ltr num">{displayDigits(phone)}</span> را وارد کنید.
            </p>
            <div dir="ltr">
              <PinInput key={otpAttempt} length={6} onComplete={(code) => void handleOtpSubmit(code)} disabled={isLoading} />
            </div>
            {error && <FormError message={error} />}
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <ResendOtpButton
                onResend={async () => {
                  const result = await sendOtp(normalizeDigits(phone));
                  if (!result.success) setError(result.error || "خطا در ارسال مجدد کد");
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => { setStep("phone"); setError(""); }}
              >
                تغییر شماره
              </button>
            </div>
          </div>
        )}

        {step === "name" && (
          <div style={{ paddingTop: 8 }}>
            <p className="t-s" style={{ marginBottom: 18 }}>اولین بار است؛ یک حساب کوچک می‌سازیم.</p>
            <label className="field">
              <span>نام و نام خانوادگی</span>
              <input
                className="input"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLoading && void handleNameSubmit()}
                placeholder="مثال: سارا احمدی"
                autoComplete="name"
              />
            </label>
            {error && <FormError message={error} />}
            <button type="button" className="btn pri block" style={{ marginTop: 20 }} disabled={isLoading} onClick={() => void handleNameSubmit()}>
              {isLoading ? "..." : "ساخت حساب"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
