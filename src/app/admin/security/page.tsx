"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function AdminSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (isLoading) return;
    if (!currentPassword) {
      setError("رمز فعلی الزامی است");
      return;
    }
    if (newPassword.trim().length < 8) {
      setError("رمز جدید باید حداقل ۸ کاراکتر باشد");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("تکرار رمز جدید مطابقت ندارد");
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch("/api/super-admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "تغییر رمز انجام نشد");
        setIsLoading(false);
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch {
      setError("خطای سرور");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-normal">امنیت</h2>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Card className="surface p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-body text-foreground">تغییر رمز عبور مدیر کل</h3>
              <p className="text-caption text-muted-foreground mt-0.5">
                رمز جدید حداقل ۸ کاراکتر، با حروف انگلیسی
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-caption">رمز فعلی</Label>
              <div className="relative mt-1">
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-12 pe-10 text-left"
                  dir="ltr"
                  placeholder="••••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  aria-label={showPasswords ? "پنهان‌کردن رمز" : "نمایش رمز"}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-caption">رمز جدید</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 h-12 text-left"
                dir="ltr"
                placeholder="••••••••••"
                autoComplete="new-password"
              />
            </div>

            <div>
              <Label className="text-caption">تکرار رمز جدید</Label>
              <Input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 h-12 text-left"
                dir="ltr"
                placeholder="••••••••••"
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && (
              <p className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                رمز عبور با موفقیت تغییر کرد
              </p>
            )}

            <Button type="submit" disabled={isLoading} className="w-full gap-2 rounded-full">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              تغییر رمز عبور
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
