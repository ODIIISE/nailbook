"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CustomerNav } from "@/components/layout/customer-nav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toPersianDigits } from "@/lib/jalali";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header title="پروفایل" />
        <div className="px-4 pt-6 pb-24">
          <div className="mx-auto max-w-lg">
            <div className="text-center py-16">
              <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-h3 text-foreground mb-2">وارد شوید</h2>
              <p className="text-[13px] text-muted-foreground mb-6 max-w-xs mx-auto">
                برای مشاهده پروفایل و اطلاعات حساب کاربری وارد شوید
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="gap-2"
              >
                ورود
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <CustomerNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="پروفایل" />

      <div className="px-4 pt-6 pb-24">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
          </div>

          <Card className="glass p-4 shadow-card">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/50">
                  <User className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نام</p>
                  <p className="text-[15px] font-bold text-foreground">{user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/50">
                  <Phone className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">شماره موبایل</p>
                  <p className="text-[15px] font-bold text-foreground" dir="ltr">
                    {toPersianDigits(user.phone)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Button
            variant="outline"
            className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 ml-2" />
            خروج از حساب
          </Button>
        </div>
      </div>

      <CustomerNav />
    </div>
  );
}
