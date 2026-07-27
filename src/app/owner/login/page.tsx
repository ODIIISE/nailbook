"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { PinInput } from "@/components/booking/pin-input";
import { AuthCard, AuthCardRoot, AuthError } from "@/components/auth/auth-card";
import { ResendOtpButton } from "@/components/auth/resend-otp-button";
import { normalizeDigits, isValidIranianPhone, displayDigits } from "@/lib/digits";

const SALON_NAME = "استدیو تخصصی ناخن فورهند";

type Step = "phone" | "otp";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("phone");

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
        return;
      }
      router.replace("/owner?welcome=1");
    } catch {
      setIsLoading(false);
      setError("خطای سرور");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <AuthCardRoot className="w-full max-w-sm animate-scale">
          {step === "phone" && (
          <AuthCard
            icon={<ShieldCheck className="h-6 w-6" />}              title="ورود مدیر"
                subtitle={SALON_NAME}
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
                  className="h-14 text-left text-lg rounded-2xl"
                  dir="ltr"
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
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

        {step === "otp" && (
          <AuthCard
            icon={<ShieldCheck className="h-6 w-6" />}
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
      </AuthCardRoot>
    </div>
  );
}
