"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isLoading) return;
    if (phone.length < 10) {
      setError("شماره موبایل معتبر نیست");
      return;
    }
    if (password.length < 4) {
      setError("رمز عبور الزامی است");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin: password }),
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
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <form ref={formRef} onSubmit={handleSubmit} className="w-full max-w-sm">
        <Card className="glass p-6">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-h1 text-foreground">ورود مدیر کل</h1>
            <p className="text-caption text-muted-foreground mt-1">
              شماره موبایل و رمز عبور خود را وارد کنید
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-caption">شماره موبایل</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 h-12 text-left"
                dir="ltr"
                placeholder="09121234567"
                autoFocus
                autoComplete="username"
              />
            </div>

            <div>
              <Label className="text-caption">رمز عبور</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pe-10 text-left"
                  dir="ltr"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "پنهان‌کردن رمز" : "نمایش رمز"}
                  className="absolute inset-y-0 left-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-caption text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              size="xl"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={isLoading || phone.length < 10 || password.length < 4}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ورود...
                </span>
              ) : (
                "ورود"
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
