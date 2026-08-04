"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { isValidIranianPhone, normalizeDigits } from "@/lib/digits";

export default function BootstrapPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const normalized = normalizeDigits(phone);
    if (!isValidIranianPhone(normalized)) {
      setError("شماره موبایل معتبر نیست");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bootstrap-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalized, name: name || "مدیر", setupSecret: setupSecret || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در ایجاد اکانت مدیر");
        setIsLoading(false);
        return;
      }
      router.push("/owner?welcome=1");
    } catch {
      setError("خطای سرور");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm glass rounded-3xl p-6 animate-scale">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-6 w-6 text-foreground" />
          </div>
          <h1 className="text-h1 text-foreground">ایجاد اکانت مدیر</h1>
          <p className="text-caption text-muted-foreground mt-1">
            فقط زمانی که هیچ مدیری وجود ندارد کار می‌کند
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-caption">شماره موبایل</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="mt-1"
              dir="ltr"
              placeholder="09121234567"
            />
          </div>
          <div>
            <Label className="text-caption">نام (اختیاری)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="mt-1"
              placeholder="مدیر"
            />
          </div>
          <div>
            <Label className="text-caption">کلید راه‌اندازی</Label>
            <Input
              value={setupSecret}
              onChange={(e) => setSetupSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="mt-1"
              type="password"
              dir="ltr"
              placeholder="فقط برای راه‌اندازی اولیه در محیط تولید"
              autoComplete="off"
            />
            <p className="text-small text-muted-foreground mt-1">
              کلید BOOTSTRAP_OWNER_SECRET در تنظیمات Vercel
            </p>
          </div>
          {error && (
            <p className="text-caption text-destructive text-center">{error}</p>
          )}
          <Button
            size="xl"
            className="w-full bg-foreground text-background hover:bg-foreground/90"
            onClick={handleSubmit}
            disabled={isLoading || !isValidIranianPhone(normalizeDigits(phone))}
          >
            {isLoading ? "در حال ایجاد..." : "ایجاد اکانت"}
          </Button>
        </div>
      </div>
    </div>
  );
}
