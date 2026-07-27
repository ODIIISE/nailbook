"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/booking/pin-input";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = () => {
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
      const res = await fetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "شماره یا رمز اشتباه است");
        setIsLoading(false);
        return;
      }
      toast.success("ورود موفق");
      router.replace("/admin");
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
            <h1 className="text-h1 text-foreground">ورود مدیر کل</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              شماره موبایل و رمز ۴ رقمی خود را وارد کنید
            </p>
          </div>

          {step === "phone" && (
            <div className="space-y-4">
              <div>
                <Label className="text-[13px]">شماره موبایل</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                  dir="ltr"
                  placeholder="09121234567"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-[13px] text-destructive text-center">{error}</p>
              )}
              <Button
                size="xl"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                onClick={handlePhoneSubmit}
                disabled={phone.length < 10}
              >
                ادامه
              </Button>
            </div>
          )}

          {step === "pin" && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground text-center">
                رمز ۴ رقمی خود را وارد کنید
              </p>
              <PinInput onComplete={handlePinComplete} disabled={isLoading} />
              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {error && (
                <p className="text-[13px] text-destructive text-center">{error}</p>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("phone")}
                disabled={isLoading}
              >
                تغییر شماره
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
