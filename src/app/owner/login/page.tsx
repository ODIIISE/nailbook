"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

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
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-h1 text-foreground">ورود مدیر</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {salon?.name || "ناخن‌های سوفی"}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-[13px]">ایمیل</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mt-1"
              dir="ltr"
              placeholder="sophie@nailbook.ir"
            />
          </div>
          <div>
            <Label className="text-[13px]">رمز عبور</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="mt-1"
              placeholder="••••••"
            />
          </div>

          {error && (
            <p className="text-[13px] text-destructive text-center">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? "در حال ورود..." : "ورود"}
          </Button>
        </div>

        <p className="mt-4 text-[13px] text-muted-foreground text-center">
          دمو: sophie@nailbook.ir / 123456
        </p>
      </Card>
    </div>
  );
}

const salon = { name: "استدیو تخصصی ناخن فورهند" };
