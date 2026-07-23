"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, Users, Calendar, Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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

interface Booking {
  date_gregorian: string;
  status: string;
  paid: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/salons").then((r) => r.json()),
      fetch("/api/admin/bookings").then((r) => r.json()),
    ])
      .then(([salonsData, bookingsData]) => {
        if (Array.isArray(salonsData)) setSalons(salonsData);
        if (Array.isArray(bookingsData)) setBookings(bookingsData);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const totalUsers = salons.reduce((sum, s) => sum + (parseInt(s.user_count as any) || 0), 0);
  const totalBookings = bookings.length;
  const todayBookings = bookings.filter((b) => {
    const today = new Date().toISOString().split("T")[0];
    return b.date_gregorian?.startsWith(today);
  }).length;

  // Bookings by status for pie chart
  const statusData = [
    { name: "رزرو شده", value: bookings.filter((b) => b.status === "reserved").length, color: "#3B82F6" },
    { name: "تأیید شده", value: bookings.filter((b) => b.status === "confirmed").length, color: "#10B981" },
    { name: "انجام شده", value: bookings.filter((b) => b.status === "completed").length, color: "#8B5CF6" },
    { name: "لغو شده", value: bookings.filter((b) => b.status === "cancelled").length, color: "#EF4444" },
  ].filter((d) => d.value > 0);

  // Bookings per salon for bar chart
  const salonData = salons.map((s) => ({
    name: s.name.length > 10 ? s.name.slice(0, 10) + "..." : s.name,
    bookings: parseInt(s.booking_count as any) || 0,
    users: parseInt(s.user_count as any) || 0,
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">داشبورد</h2>
        <Button onClick={() => router.push("/admin/salons")} className="gap-2 rounded-full" size="sm">
          <Plus className="h-4 w-4" />
          سالن جدید
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">سالن‌ها</span>
            <Store className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold">{salons.length}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">کاربران</span>
            <Users className="h-4 w-4 text-success" />
          </div>
          <p className="text-2xl font-extrabold">{totalUsers}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">رزروها</span>
            <Calendar className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-extrabold">{totalBookings}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">امروز</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-extrabold">{todayBookings}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <div className="p-4 rounded-2xl border border-border">
          <h3 className="text-sm font-bold mb-4">وضعیت رزروها</h3>
          {statusData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              داده‌ای موجود نیست
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Salon Comparison */}
        <div className="p-4 rounded-2xl border border-border">
          <h3 className="text-sm font-bold mb-4">مقایسه سالن‌ها</h3>
          {salonData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              داده‌ای موجود نیست
            </div>
          )}
        </div>
      </div>

      {/* Salon List */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold">سالن‌ها</h3>
        </div>
        {salons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>هنوز سالنی ثبت نشده</p>
            <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => router.push("/admin/salons")}>
              اولین سالن را ایجاد کنید
            </Button>
          </div>
        ) : (
          <div>
            {salons.map((salon, i) => (
              <div
                key={salon.id}
                className={`flex items-center justify-between p-4 hover:bg-muted/30 cursor-pointer transition-colors ${
                  i < salons.length - 1 ? "border-b border-border" : ""
                }`}
                onClick={() => router.push(`/admin/salons/${salon.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Store className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{salon.name}</p>
                    <p className="text-xs text-muted-foreground">{salon.address || salon.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{parseInt(salon.user_count as any) || 0} کاربر</span>
                  <span>{parseInt(salon.booking_count as any) || 0} رزرو</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
