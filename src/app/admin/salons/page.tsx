"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus, Store, ExternalLink, Loader2 } from "lucide-react";

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

  useEffect(() => {
    fetch("/api/admin/salons")
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setSalons(data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="rounded-full">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-extrabold">مدیریت سالن‌ها</h2>
        </div>
        <Button onClick={() => router.push("/admin/salons/new")} className="gap-2 rounded-full" size="sm">
          <Plus className="h-4 w-4" />
          سالن جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : salons.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <p>هنوز سالنی ثبت نشده</p>
          <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => router.push("/admin/salons/new")}>
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
