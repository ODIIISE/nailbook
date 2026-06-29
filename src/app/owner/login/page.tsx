"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OwnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    setError("");

    setTimeout(() => {
      if (email === "sophie@nailbook.ir" && password === "123456") {
        document.cookie = "owner_session=true; path=/owner";
        router.push("/owner");
      } else {
        setError("ایمیل یا رمز عبور اشتباه است");
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-warm-white flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose/10 text-2xl">
            💅
          </div>
          <h1 className="text-xl font-bold text-foreground">ورود مدیر</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ناخن‌های سوفی
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email">ایمیل</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="sophie@nailbook.ir"
              className="mt-1"
              dir="ltr"
            />
          </div>
          <div>
            <Label htmlFor="password">رمز عبور</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••"
              className="mt-1"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            className="w-full bg-rose hover:bg-rose/90 text-white"
            disabled={isLoading}
            onClick={handleLogin}
          >
            {isLoading ? "در حال ورود..." : "ورود"}
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center">
          دمو: sophie@nailbook.ir / 123456
        </p>
      </Card>
    </div>
  );
}
