"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { PinInput } from "@/components/booking/pin-input";
import { normalizeDigits } from "@/lib/digits";
import { toast } from "sonner";

const salon = { name: "استدیو تخصصی ناخن فورهند" };

export default function OwnerLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "pin">("phone");

  const handlePhoneSubmit = () => {
    const normalized = normalizeDigits(phone);
    if (normalized.length < 10) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    setError("");
    setPhone(normalized);
    setStep("pin");
  };

  const handlePinSubmit = async (pin: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/owner-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeDigits(phone), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ورود");
        setIsLoading(false);
        return;
      }
      window.location.href = "/owner?welcome=1";
    } catch {
      setError("خطای سرور");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && step === "phone") handlePhoneSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-3xl p-6 animate-scale">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/50">
            <Sparkles className="h-6 w-6 text-foreground" />
          </div>
          <h1 className="text-h1 text-foreground">ورود مدیر</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {salon.name}
          </p>
        </div>

        <div className="space-y-4">
          {step === "phone" && (
            <>
              <div>
                <Label className="text-[13px]">شماره موبایل</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="mt-1"
                  dir="ltr"
                  placeholder="09121234567"
                />
              </div>
              {error && (
                <p className="text-[13px] text-destructive text-center">{error}</p>
              )}
              <Button
                size="xl"
                className="w-full"
                onClick={handlePhoneSubmit}
                disabled={phone.length < 10}
              >
                ادامه
              </Button>
            </>
          )}

          {step === "pin" && (
            <>
              <div className="text-center">
                <p className="text-[13px] text-muted-foreground">
                  کد ۴ رقمی خود را وارد کنید
                </p>
                <p className="text-[13px] text-muted-foreground mt-1" dir="ltr">
                  {phone}
                </p>
              </div>
              <PinInput onComplete={handlePinSubmit} disabled={isLoading} />
              {error && (
                <p className="text-[13px] text-destructive text-center">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
