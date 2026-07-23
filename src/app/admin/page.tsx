"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Store, Users, Calendar, Plus, TrendingUp, TrendingDown, DollarSign, CreditCard, Loader2, ArrowUpRight, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  salons: any[];
  bookingStats: any;
  todayBookings: number;
  revenue: any;
  salonRevenue: any[];
  dailyBookings: any[];
  totalUsers: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const formatPrice = (n: number) => n.toLocaleString("fa-IR");

  // Prepare chart data
  const chartData = stats.dailyBookings.map((d: any) => ({
    name: d.date?.slice(5) || "",
    count: parseInt(d.count) || 0,
  }));

  const statusData = [
    { name: "رزرو شده", value: parseInt(stats.bookingStats.reserved) || 0, color: "#1D9BF0" },
    { name: "تأیید شده", value: parseInt(stats.bookingStats.confirmed) || 0, color: "#00BA7C" },
    { name: "انجام شده", value: parseInt(stats.bookingStats.completed) || 0, color: "#8B5CF6" },
    { name: "لغو شده", value: parseInt(stats.bookingStats.cancelled) || 0, color: "#F4212E" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold">داشبورد</h2>
        <Button onClick={() => router.push("/admin/salons")} className="gap-2 rounded-full" size="sm">
          <Plus className="h-4 w-4" />
          سالن جدید
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">درآمد کل</span>
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <p className="text-lg font-extrabold">{formatPrice(parseInt(stats.revenue.total_revenue) || 0)}</p>
          <p className="text-[10px] text-muted-foreground mt-1">تومان</p>
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">پرداخت شده</span>
            <CreditCard className="h-4 w-4 text-success" />
          </div>
          <p className="text-lg font-extrabold">{formatPrice(parseInt(stats.revenue.paid_revenue) || 0)}</p>
          <p className="text-[10px] text-success mt-1">تومان</p>
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">پرداخت نشده</span>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <p className="text-lg font-extrabold">{formatPrice(parseInt(stats.revenue.unpaid_revenue) || 0)}</p>
          <p className="text-[10px] text-destructive mt-1">تومان</p>
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">امروز</span>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-lg font-extrabold">{stats.todayBookings}</p>
          <p className="text-[10px] text-muted-foreground mt-1">رزرو</p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl border border-border text-center">
          <p className="text-2xl font-extrabold">{stats.salons.length}</p>
          <p className="text-xs text-muted-foreground">سالن</p>
        </div>
        <div className="p-3 rounded-2xl border border-border text-center">
          <p className="text-2xl font-extrabold">{stats.totalUsers}</p>
          <p className="text-xs text-muted-foreground">کاربر</p>
        </div>
        <div className="p-3 rounded-2xl border border-border text-center">
          <p className="text-2xl font-extrabold">{parseInt(stats.bookingStats.total) || 0}</p>
          <p className="text-xs text-muted-foreground">رزرو کل</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Booking Trend */}
        <div className="p-4 rounded-2xl border border-border">
          <h3 className="text-sm font-bold mb-4">رزروهای ۷ روز اخیر</h3>
          {chartData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1D9BF0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              داده‌ای موجود نیست
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="p-4 rounded-2xl border border-border">
          <h3 className="text-sm font-bold mb-4">وضعیت رزروها</h3>
          <div className="space-y-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-sm text-muted-foreground">{d.name}</span>
                </div>
                <span className="text-sm font-bold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salon Comparison */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-bold"> مقایسه سالن‌ها</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right p-3 text-muted-foreground font-medium">سالن</th>
                <th className="text-right p-3 text-muted-foreground font-medium">رزرو</th>
                <th className="text-right p-3 text-muted-foreground font-medium">درآمد</th>
                <th className="text-right p-3 text-muted-foreground font-medium">وضعیت</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {stats.salonRevenue.map((s: any, i: number) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/admin/salons/${stats.salons.find((sal: any) => sal.name === s.salon_name)?.id}`)}
                >
                  <td className="p-3 font-medium">{s.salon_name}</td>
                  <td className="p-3">{parseInt(s.bookings) || 0}</td>
                  <td className="p-3">{formatPrice(parseInt(s.revenue) || 0)} تومان</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">
                      فعال
                    </span>
                  </td>
                  <td className="p-3">
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
              {stats.salonRevenue.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground text-sm">
                    داده‌ای موجود نیست
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
