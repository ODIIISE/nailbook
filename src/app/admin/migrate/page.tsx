"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/booking/pin-input";
import { Database } from "lucide-react";
import { toast } from "sonner";

export default function AdminMigratePage() {
  const [step, setStep] = useState<"login" | "run" | "done">("login");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleLogin = async (pin: string) => {
    setIsLoading(true);
    setError("");
    try {
      const loginRes = await fetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      if (!loginRes.ok) {
        setError("شماره یا رمز اشتباه است");
        setIsLoading(false);
        return;
      }
      setStep("run");
    } catch {
      setError("خطای سرور");
    }
    setIsLoading(false);
  };

  const runMigration = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/migrate", { method: "POST" });
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
        setStep("done");
        toast.success("مایگریشن با موفقیت اجرا شد");
      } else {
        setError(data.error || "خطا در مایگریشن");
      }
    } catch {
      setError("خطای سرور");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
        <Card className="glass p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-h1 text-foreground">مایگریشن دیتابیس</h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              ایجاد جداول جدید و اضافه کردن salon_id
            </p>
          </div>

          {step === "login" && (
            <div className="space-y-4">
              <div>
                <Label className="text-[13px]">شماره مدیر کل</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                  dir="ltr"
                  placeholder="09121234567"
                />
              </div>
              <p className="text-[13px] text-muted-foreground text-center">
                رمز مدیر کل خود را وارد کنید
              </p>
              <PinInput onComplete={handleLogin} disabled={isLoading} />
              {error && (
                <p className="text-[13px] text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {step === "run" && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground text-center">
                آماده اجرای مایگریشن
              </p>
              <Button
                className="w-full"
                onClick={runMigration}
                disabled={isLoading}
              >
                {isLoading ? "در حال اجرا..." : "اجرا کن"}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              <p className="text-[13px] text-success text-center font-bold">
                مایگریشن با موفقیت اجرا شد
              </p>
              <div className="text-[12px] text-muted-foreground space-y-1 max-h-60 overflow-y-auto">
                {results.map((r, i) => (
                  <p key={i} className={r.includes("error") ? "text-destructive" : ""}>
                    {r}
                  </p>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
