"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, Store, Trash2, ExternalLink } from "lucide-react";
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

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-bold text-foreground">مدیریت سالن‌ها</h2>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          سالن جدید
        </Button>
      </div>

      {/* Create Salon Form */}
      {showCreate && (
        <Card className="p-4 space-y-4">
          <h3 className="font-bold">سالن جدید</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>نام سالن *</Label>
              <Input
                value={newSalon.name}
                onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                placeholder="مثال: استدیو ناخن فورهند"
              />
            </div>
            <div>
              <Label>Slug (اختیاری)</Label>
              <Input
                value={newSalon.slug}
                onChange={(e) => setNewSalon({ ...newSalon, slug: e.target.value })}
                placeholder="forehand-nail"
              />
            </div>
            <div>
              <Label>تلفن</Label>
              <Input
                value={newSalon.phone}
                onChange={(e) => setNewSalon({ ...newSalon, phone: e.target.value })}
                placeholder="09121234567"
                dir="ltr"
              />
            </div>
            <div>
              <Label>آدرس</Label>
              <Input
                value={newSalon.address}
                onChange={(e) => setNewSalon({ ...newSalon, address: e.target.value })}
                placeholder="مشهد، خیابان ..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "در حال ایجاد..." : "ایجاد سالن"}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              انصراف
            </Button>
          </div>
        </Card>
      )}

      {/* Salon List */}
      {salons.length === 0 ? (
        <Card className="p-8 text-center">
          <Store className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">هنوز سالنی ثبت نشده</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            اولین سالن را ایجاد کنید
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {salons.map((salon) => (
            <Card key={salon.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{salon.name}</h3>
                  <p className="text-sm text-muted-foreground">{salon.address || salon.slug}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${salon.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {salon.is_active ? 'فعال' : 'غیرفعال'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                <span>{parseInt(salon.user_count as any) || 0} کاربر</span>
                <span>{parseInt(salon.booking_count as any) || 0} رزرو</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/admin/salons/${salon.id}`)}
                >
                  مدیریت
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://${salon.slug}.vercel.app`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
