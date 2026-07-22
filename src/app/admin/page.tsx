"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Users, Calendar, Plus } from "lucide-react";

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

export default function AdminDashboard() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/salons")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSalons(data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalUsers = salons.reduce((sum, s) => sum + (parseInt(s.user_count as any) || 0), 0);
  const totalBookings = salons.reduce((sum, s) => sum + (parseInt(s.booking_count as any) || 0), 0);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">داشبورد</h2>
        <Button onClick={() => router.push("/admin/salons")} className="gap-2">
          <Plus className="h-4 w-4" />
          سالن جدید
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{salons.length}</p>
              <p className="text-sm text-muted-foreground">سالن فعال</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">کل کاربران</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalBookings}</p>
              <p className="text-sm text-muted-foreground">کل رزروها</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Salon List */}
      <Card className="p-4">
        <h3 className="text-lg font-bold mb-4">سالن‌ها</h3>
        {salons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>هنوز سالنی ثبت نشده</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/salons")}>
              اولین سالن را ایجاد کنید
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {salons.map((salon) => (
              <div
                key={salon.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer"
                onClick={() => router.push(`/admin/salons/${salon.id}`)}
              >
                <div>
                  <p className="font-medium">{salon.name}</p>
                  <p className="text-sm text-muted-foreground">{salon.address || salon.slug}</p>
                </div>
                <div className="text-left text-sm text-muted-foreground">
                  <p>{parseInt(salon.user_count as any) || 0} کاربر</p>
                  <p>{parseInt(salon.booking_count as any) || 0} رزرو</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
