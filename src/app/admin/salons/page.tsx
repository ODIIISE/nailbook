"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, Store, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Salon {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  is_active: boolean;
  user_count: number;
  booking_count: number;
  created_at: string;
}

export default function AdminSalonsPage() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSalon, setNewSalon] = useState({ name: "", phone: "", address: "", slug: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    try {
      const res = await fetch("/api/admin/salons");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSalons(data);
      }
    } catch (error) {
      console.error("Failed to fetch salons:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newSalon.name.trim()) {
      toast.error("نام سالن الزامی است");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/salons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSalon),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "خطا در ایجاد سالن");
        return;
      }

      toast.success("سالن با موفقیت ایجاد شد");
      setShowCreate(false);
      setNewSalon({ name: "", phone: "", address: "", slug: "" });
      fetchSalons();
    } catch (error) {
      toast.error("خطای سرور");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="rounded-full">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-extrabold">مدیریت سالن‌ها</h2>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2 rounded-full" size="sm">
          <Plus className="h-4 w-4" />
          سالن جدید
        </Button>
      </div>

      {/* Create Salon Form */}
      {showCreate && (
        <div className="p-5 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold">سالن جدید</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>نام سالن *</Label>
              <Input
                value={newSalon.name}
                onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                placeholder="مثال: استدیو ناخن فورهند"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Slug (اختیاری)</Label>
              <Input
                value={newSalon.slug}
                onChange={(e) => setNewSalon({ ...newSalon, slug: e.target.value })}
                placeholder="forehand-nail"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div>
              <Label>تلفن</Label>
              <Input
                value={newSalon.phone}
                onChange={(e) => setNewSalon({ ...newSalon, phone: e.target.value })}
                placeholder="09121234567"
                dir="ltr"
                className="mt-1"
              />
            </div>
            <div>
              <Label>آدرس</Label>
              <Input
                value={newSalon.address}
                onChange={(e) => setNewSalon({ ...newSalon, address: e.target.value })}
                placeholder="مشهد، خیابان ..."
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating} className="rounded-full">
              {creating ? "در حال ایجاد..." : "ایجاد سالن"}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="rounded-full">
              انصراف
            </Button>
          </div>
        </div>
      )}

      {/* Salon List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : salons.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <p>هنوز سالنی ثبت نشده</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => setShowCreate(true)}>
            اولین سالن را ایجاد کنید
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden">
          {salons.map((salon, i) => (
            <div
              key={salon.id}
              className={`p-4 hover:bg-muted/30 transition-colors ${
                i < salons.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Store className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{salon.name}</p>
                    <p className="text-xs text-muted-foreground">{salon.address || salon.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-left text-xs text-muted-foreground">
                    <span>{parseInt(salon.user_count as any) || 0} کاربر</span>
                    <span className="mx-2">•</span>
                    <span>{parseInt(salon.booking_count as any) || 0} رزرو</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/salons/${salon.id}`)}
                    className="rounded-full"
                  >
                    مدیریت
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`https://${salon.slug}.vercel.app`, "_blank")}
                    className="rounded-full"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
