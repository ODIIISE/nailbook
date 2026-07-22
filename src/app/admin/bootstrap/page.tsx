"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/booking/pin-input";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminBootstrapPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "pin" | "done">("form");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
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

  const handlePinComplete = async (pin: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/bootstrap-super-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, name: name || "مدیر کل" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ایجاد اکانت");
        setIsLoading(false);
        return;
      }
      toast.success("اکانت مدیر کل با موفقیت ایجاد شد");
      setStep("done");
      setTimeout(() => router.push("/admin"), 1500);
    } catch {
      setError("خطای سرور");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-sm">
        <Card className="glass p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-h1 text-foreground">ایجاد اکانت مدیر کل</h1>
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
                  placeholder="مدیر کل"
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
                یک رمز ۴ رقمی برای مدیر کل انتخاب کنید
              </p>
              <PinInput onComplete={handlePinComplete} disabled={isLoading} />
              {error && (
                <p className="text-[13px] text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {step === "done" && (
            <div className="text-center py-4">
              <p className="text-[15px] font-bold text-success">اکانت با موفقیت ایجاد شد</p>
              <p className="text-[13px] text-muted-foreground mt-2">در حال انتقال...</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
