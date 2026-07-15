"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { AppNavbar } from "@/components/layout/app-navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Phone, LogOut, ArrowLeft, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toPersianDigits } from "@/lib/jalali";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const startEdit = () => {
    setEditName(user?.name || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !user) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, name: editName.trim() }),
      });
      if (res.ok) {
        const updated = { ...user, name: editName.trim() };
        localStorage.setItem("nailbook_user", JSON.stringify(updated));
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
    setSaving(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen">
        <AppHeader title="پروفایل" />
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
              <Button onClick={() => router.push("/login")} className="gap-2">
                ورود
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <AppNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader title="پروفایل" />

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
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">نام</p>
                  {editing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 h-9 text-[15px] font-bold"
                      placeholder="نام خود را وارد کنید"
                    />
                  ) : (
                    <p className="text-[15px] font-bold text-foreground">{user.name || "بدون نام"}</p>
                  )}
                </div>
                {editing ? (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={saveEdit} disabled={saving}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={startEdit}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
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

      <AppNavbar />
    </div>
  );
}
