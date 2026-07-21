"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { PinInput } from "@/components/booking/pin-input";

export default function BootstrapPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"form" | "pin" | "done">("form");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = () => {
    if (phone.length < 10) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    setError("");
    setStep("pin");
  };

  const handlePinComplete = async (enteredPin: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bootstrap-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: enteredPin, name: name || "مدیر" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ایجاد اکانت مدیر");
        setIsLoading(false);
        return;
      }
      setStep("done");
      setTimeout(() => router.push("/owner?welcome=1"), 1500);
    } catch {
      setError("خطای سرور");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm glass rounded-3xl p-6 animate-scale">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/50">
            <Sparkles className="h-6 w-6 text-foreground" />
          </div>
          <h1 className="text-h1 text-foreground">ایجاد اکانت مدیر</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            فقط زمانی که هیچ مدیری وجود ندارد کار می‌کند
          </p>
        </div>

        {step === "form" && (
          <div className="space-y-4">
            <div>
              <Label className="text-[13px]">شماره موبایل</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
                dir="ltr"
                placeholder="09121234567"
              />
            </div>
            <div>
              <Label className="text-[13px]">نام (اختیاری)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="مدیر"
              />
            </div>
            {error && (
              <p className="text-[13px] text-destructive text-center">{error}</p>
            )}
            <Button
              size="xl"
              variant="paper"
              className="w-full"
              onClick={handleFormSubmit}
              disabled={phone.length < 10}
            >
              ادامه
            </Button>
          </div>
        )}

        {step === "pin" && (
          <div className="space-y-4">
            <p className="text-[13px] text-muted-foreground text-center">
              یک رمز ۴ رقمی برای مدیر انتخاب کنید
            </p>
            <PinInput onComplete={handlePinComplete} disabled={isLoading} />
            {error && (
              <p className="text-[13px] text-destructive text-center">{error}</p>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-4">
            <p className="text-[15px] font-bold text-success">اکانت مدیر با موفقیت ایجاد شد</p>
            <p className="text-[13px] text-muted-foreground mt-2">در حال انتقال...</p>
          </div>
        )}
      </div>
    </div>
  );
}
