"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { PinInput } from "@/components/booking/pin-input";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";
import { getReturnTo, clearReturnTo, countOwnerDrafts } from "@/lib/session-expiry";
import { toast } from "sonner";

type Step = "phone" | "otp";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("phone");
  const [otpAttempt, setOtpAttempt] = useState(0);

  const handlePhoneSubmit = async () => {
    const normalized = normalizeDigits(phone);
    if (!isValidIranianPhone(normalized)) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    setError("");
    setPhone(normalized);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, roleContext: "owner" }),
      });
      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setError(data.error || "خطا در ارسال کد");
        return;
      }
      setStep("otp");
    } catch {
      setIsLoading(false);
      setError("خطای سرور");
    }
  };

  const handleOtpSubmit = async (code: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeDigits(phone), code, roleContext: "owner" }),
      });
      const data = await res.json();
      setIsLoading(false);

      if (!res.ok) {
        setError(data.error || "کد نادرست است");
        setOtpAttempt((a) => a + 1);
        return;
      }
      // Prime localStorage so AuthProvider picks up the owner user
      // synchronously on the next page, avoiding a loading flash while
      // /api/auth/me validates the newly-issued session cookie.
      if (data.user) {
        try {
          localStorage.setItem("nailbook_user", JSON.stringify(data.user));
          // Same-tab announcement so the already-mounted AuthProvider (menu,
          // navbar) switches to the owner role without a full reload.
          window.dispatchEvent(new Event("nailbook:auth-sync"));
        } catch { /* quota exceeded or private mode — harmless */ }
      }
      // AUDIT-012: expiry (or bookmark) sent the owner here — return them to
      // the exact page they were working on. The Persian nudge only appears
      // when drafts actually survived, so it never lies.
      const returnTo = getReturnTo();
      clearReturnTo();
      const drafts = countOwnerDrafts();
      router.replace(returnTo || "/owner?welcome=1");
      if (drafts > 0) {
        // The toast outlives the route change and greets the owner on return.
        setTimeout(() => {
          toast.success(drafts === 1 ? "تغییرات ذخیره‌نشده شما حفظ شد" : "تغییرات ذخیره‌نشده شما حفظ شد — از همان‌جا ادامه دهید", { duration: 6000 });
        }, 400);
      }
    } catch {
      setIsLoading(false);
      setError("خطای سرور");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col" style={{ padding: "10dvh 24px 32px" }}>
      <div className="center" style={{ marginBottom: 34 }}>
        <span className="nail" style={{ width: 64, height: 64, margin: "0 auto 16px" }}>
          <ShieldCheck size={26} strokeWidth={1.3} aria-hidden="true" style={{ color: "var(--pearl)" }} />
        </span>
        <p className="eyebrow">FOREHAND · STUDIO</p>
        <h1 className="h-l" style={{ marginTop: 8 }}>ورود مدیر</h1>
      </div>

      {step === "phone" && (
        <div>
          <p className="t-s center" style={{ marginBottom: 20 }}>کد ورود به شماره مدیر پیامک می‌شود.</p>
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && void handlePhoneSubmit()}
            placeholder="۰۹۱۲ ۰۰۰ ۰۰۰۰"
            autoFocus
            inputMode="numeric"
            autoComplete="tel"
            aria-label="شماره موبایل مدیر"
            style={{ direction: "ltr", textAlign: "center", fontSize: 22, letterSpacing: ".08em", minHeight: 64 }}
          />
          {error && (
            <p className="t-s row center" style={{ gap: 6, color: "var(--wine-hi)", marginTop: 10 }} role="alert">
              <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
              {error}
            </p>
          )}
          <button
            type="button"
            className="btn pri block"
            style={{ marginTop: 20 }}
            onClick={() => void handlePhoneSubmit()}
            disabled={isLoading || !isValidIranianPhone(normalizeDigits(phone))}
          >
            {isLoading ? "در حال ارسال..." : "دریافت کد"}
          </button>
        </div>
      )}

      {step === "otp" && (
        <div>
          <p className="t-s center" style={{ marginBottom: 6 }}>کد ۶ رقمی پیامک‌شده به</p>
          <p className="center ltr num" style={{ fontSize: 17, marginBottom: 20 }}>{displayDigits(phone)}</p>
          <div dir="ltr">
            <PinInput key={otpAttempt} length={6} onComplete={(code) => void handleOtpSubmit(code)} disabled={isLoading} />
          </div>
          {error && (
            <p className="t-s row center" style={{ gap: 6, color: "var(--wine-hi)", marginTop: 10 }} role="alert">
              <AlertCircle size={16} strokeWidth={1.5} aria-hidden="true" />
              {error}
            </p>
          )}
          <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
            <ResendOtpButton
              onResend={async () => {
                try {
                  const res = await fetch("/api/auth/send-otp", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: normalizeDigits(phone), roleContext: "owner" }),
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    setError(data.error || "خطا در ارسال مجدد کد");
                  }
                } catch {
                  setError("خطای سرور");
                }
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => { setStep("phone"); setError(""); }}
            >
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
              تغییر شماره
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
