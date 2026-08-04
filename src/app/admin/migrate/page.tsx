"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/booking/pin-input";
import { Database } from "lucide-react";
import { toast } from "sonner";

export default function AdminMigratePage() {
  const [step, setStep] = useState<"login" | "run" | "done">("login");
  const [checking, setChecking] = useState(true);

  // If already logged in as super admin, start on the migration screen
  useEffect(() => {
    fetch("/api/super-admin/me")
      .then((res) => {
        if (res.ok) {
          setStep("run");
        }
      })
      .finally(() => setChecking(false));
  }, []);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

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

  const runFileMigrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/run-migrations", { method: "POST" });
      const data = await res.json();
      if (data.success && data.results) {
        setResults(data.results.map((r: { name: string; success: boolean; error?: string }) =>
          `${r.name}: ${r.success ? "OK" : `ERROR - ${r.error}`}`
        ));
        setStep("done");
        toast.success("مایگریشن فایل‌ها اجرا شد");
      } else {
        setError(data.error || "خطا در مایگریشن فایل‌ها");
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
            <p className="text-caption text-muted-foreground mt-1">
              ایجاد جداول جدید و اضافه کردن salon_id
            </p>
          </div>

          {step === "login" && (
            <div className="space-y-4">
              <div>
                <Label className="text-caption">شماره مدیر کل</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                  dir="ltr"
                  placeholder="09121234567"
                />
              </div>
              <p className="text-caption text-muted-foreground text-center">
                رمز مدیر کل خود را وارد کنید
              </p>
              <PinInput onComplete={handleLogin} disabled={isLoading} />
              {error && (
                <p className="text-caption text-destructive text-center">{error}</p>
              )}
            </div>
          )}

          {step === "run" && (
            <div className="space-y-4">
              <Button
                className="w-full"
                onClick={runMigration}
                disabled={isLoading}
              >
                {isLoading ? "در حال اجرا..." : "ایجاد جداول اصلی (salons, super_admins, salon_id)"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={runFileMigrations}
                disabled={isLoading}
              >
                اجرای فایل‌های مایگریشن (OTP, session_version, ...)
              </Button>
              <p className="text-small text-muted-foreground text-center leading-relaxed">
                اگر خطای سرور هنگام دریافت کد OTP دارید، دکمهٔ دوم را بزنید تا جدول otps ساخته شود.
              </p>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-3">
              <p className="text-caption text-success text-center font-bold">
                مایگریشن با موفقیت اجرا شد
              </p>
              <div className="text-small text-muted-foreground space-y-1 max-h-60 overflow-y-auto">
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
