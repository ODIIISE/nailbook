"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Store, Users, Calendar, Plus, TrendingUp, TrendingDown, DollarSign, CreditCard, Loader2, ArrowUpRight, AlertTriangle, Clock, UserCheck, BarChart3 } from "lucide-react";
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
  const [alerts, setAlerts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "bookings" | "customers" | "operations" | "alerts">("overview");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/alerts").then((r) => r.json()),
      fetch("/api/admin/analytics?type=no-show-rate").then((r) => r.json()),
      fetch("/api/admin/analytics?type=cancellation-rate").then((r) => r.json()),
      fetch("/api/admin/analytics?type=repeat-rate").then((r) => r.json()),
      fetch("/api/admin/analytics?type=payment-status").then((r) => r.json()),
      fetch("/api/admin/analytics?type=completion-rate").then((r) => r.json()),
      fetch("/api/admin/analytics?type=peak-hours").then((r) => r.json()),
      fetch("/api/admin/analytics?type=service-popularity").then((r) => r.json()),
      fetch("/api/admin/analytics?type=top-customers").then((r) => r.json()),
    ])
      .then(([s, a, ns, cr, rr, ps, comp, ph, sp, tc]) => {
        if (!s.error) setStats(s);
        if (!a.error) setAlerts(a.alerts || []);
        setAnalytics({ noShow: ns, cancellation: cr, repeat: rr, payment: ps, completion: comp, peakHours: ph, servicePop: sp, topCustomers: tc });
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
  const today = new Date().toISOString().split("T")[0];

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

  const tabs = [
    { id: "overview" as const, label: "نمای کلی" },
    { id: "bookings" as const, label: "رزروها" },
    { id: "customers" as const, label: "مشتریان" },
    { id: "operations" as const, label: "عملیات" },
    { id: "alerts" as const, label: "هشدارها", badge: alerts.length },
  ];

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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === t.id
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className="h-5 w-5 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab stats={stats} analytics={analytics} chartData={chartData} statusData={statusData} router={router} />
      )}
      {activeTab === "bookings" && (
        <BookingsTab analytics={analytics} chartData={chartData} />
      )}
      {activeTab === "customers" && (
        <CustomersTab analytics={analytics} />
      )}
      {activeTab === "operations" && (
        <OperationsTab analytics={analytics} stats={stats} />
      )}
      {activeTab === "alerts" && (
        <AlertsTab alerts={alerts} />
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ stats, analytics, chartData, statusData, router }: any) {
  const formatPrice = (n: number) => n.toLocaleString("fa-IR");
  return (
    <div className="space-y-4">
      {/* Revenue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="درآمد کل" value={formatPrice(parseInt(stats.revenue.total_revenue) || 0)} sub="تومان" color="text-primary" />
        <StatCard icon={CreditCard} label="پرداخت شده" value={formatPrice(parseInt(stats.revenue.paid_revenue) || 0)} sub="تومان" color="text-success" />
        <StatCard icon={TrendingDown} label="پرداخت نشده" value={formatPrice(parseInt(stats.revenue.unpaid_revenue) || 0)} sub="تومان" color="text-destructive" />
        <StatCard icon={Calendar} label="امروز" value={String(stats.todayBookings)} sub="رزرو" color="text-primary" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <QuickStat label="سالن" value={stats.salons.length} />
        <QuickStat label="کاربر" value={stats.totalUsers} />
        <QuickStat label="رزرو کل" value={parseInt(stats.bookingStats.total) || 0} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">داده‌ای موجود نیست</div>
          )}
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <h3 className="text-sm font-bold mb-4">وضعیت رزروها</h3>
          <div className="space-y-2">
            {statusData.map((d: any) => (
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

      {/* Salon Table */}
      <SalonTable salons={stats.salons} salonRevenue={stats.salonRevenue} />
    </div>
  );
}

// Bookings Tab
function BookingsTab({ analytics, chartData }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={BarChart3} label="نرخ لغو" value={`${analytics.cancellation?.rate || 0}%`} color="text-destructive" />
        <StatCard icon={AlertTriangle} label="نرخ عدم حضور" value={`${analytics.noShow?.rate || 0}%`} color="text-destructive" />
        <StatCard icon={TrendingUp} label="نرخ تکرار" value={`${analytics.repeat?.rate || 0}%`} color="text-success" />
        <StatCard icon={UserCheck} label="نرخ تکمیل" value={`${analytics.completion?.rate || 0}%`} color="text-primary" />
      </div>

      {/* Peak Hours */}
      <div className="p-4 rounded-2xl border border-border">
        <h3 className="text-sm font-bold mb-4">ساعات شلوغ</h3>
        {analytics.peakHours?.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.peakHours.map((h: any) => ({ hour: `${h.hour}:00`, count: parseInt(h.count) }))}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1D9BF0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">داده‌ای موجود نیست</div>
        )}
      </div>

      {/* Service Popularity */}
      <div className="p-4 rounded-2xl border border-border">
        <h3 className="text-sm font-bold mb-4">محبوبیت خدمات</h3>
        <div className="space-y-2">
          {analytics.servicePop?.slice(0, 5).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.name}</span>
              <span className="text-sm font-bold">{s.booking_count} رزرو</span>
            </div>
          ))}
          {(!analytics.servicePop || analytics.servicePop.length === 0) && (
            <p className="text-sm text-muted-foreground text-center">داده‌ای موجود نیست</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Customers Tab
function CustomersTab({ analytics }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-border">
          <p className="text-xs text-muted-foreground mb-1">مشتریان جدید</p>
          <p className="text-2xl font-extrabold">{analytics.customerSplit?.new_customers || 0}</p>
        </div>
        <div className="p-4 rounded-2xl border border-border">
          <p className="text-xs text-muted-foreground mb-1">مشتریان بازگشتی</p>
          <p className="text-2xl font-extrabold">{analytics.customerSplit?.returning_customers || 0}</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-border">
        <h3 className="text-sm font-bold mb-4">برترین مشتریان</h3>
        <div className="space-y-2">
          {analytics.topCustomers?.slice(0, 8).map((c: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.customer_name || "مشتری"}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{c.customer_phone}</p>
              </div>
              <span className="text-sm font-bold">{c.booking_count} رزرو</span>
            </div>
          ))}
          {(!analytics.topCustomers || analytics.topCustomers.length === 0) && (
            <p className="text-sm text-muted-foreground text-center">داده‌ای موجود نیست</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Operations Tab
function OperationsTab({ analytics, stats }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon={CreditCard} label="پرداخت شده" value={`${analytics.payment?.paid_rate || 0}%`} color="text-success" />
        <StatCard icon={TrendingDown} label="پرداخت نشده" value={String(analytics.payment?.unpaid || 0)} sub="رزرو" color="text-destructive" />
        <StatCard icon={UserCheck} label="نرخ تکمیل" value={`${analytics.completion?.rate || 0}%`} color="text-primary" />
      </div>

      <SalonTable salons={stats.salons} salonRevenue={stats.salonRevenue} />
    </div>
  );
}

// Alerts Tab
function AlertsTab({ alerts }: { alerts: any[] }) {
  const severityColors: Record<string, string> = {
    error: "border-destructive bg-destructive/5",
    warning: "border-yellow-500 bg-yellow-500/5",
    info: "border-primary bg-primary/5",
  };
  const severityIcons: Record<string, any> = {
    error: AlertTriangle,
    warning: AlertTriangle,
    info: TrendingUp,
  };

  return (
    <div className="space-y-3">
      {alerts.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          <p>هشداری وجود ندارد</p>
          <p className="text-xs mt-1">همه چیز عادی به نظر می‌رسد</p>
        </div>
      ) : (
        alerts.map((alert: any, i: number) => {
          const Icon = severityIcons[alert.severity] || AlertTriangle;
          return (
            <div key={i} className={`p-4 rounded-2xl border ${severityColors[alert.severity] || "border-border"}`}>
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">{alert.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                  {alert.items && alert.items.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {alert.items.slice(0, 3).map((item: any, j: number) => (
                        <p key={j} className="text-xs text-muted-foreground">
                          {item.customer_name || item.name || item.salon_name} — {item.date_gregorian || ""}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{alert.count}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// Shared Components
function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="p-4 rounded-2xl border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-lg font-extrabold">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-3 rounded-2xl border border-border text-center">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SalonTable({ salons, salonRevenue, router }: { salons: any[]; salonRevenue: any[]; router?: any }) {
  const formatPrice = (n: number) => n.toLocaleString("fa-IR");
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-bold">مقایسه سالن‌ها</h3>
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
            {salonRevenue.map((s: any, i: number) => {
              const salon = salons.find((sal: any) => sal.name === s.salon_name);
              return (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                  onClick={() => salon && router.push(`/admin/salons/${salon.id}`)}
                >
                  <td className="p-3 font-medium">{s.salon_name}</td>
                  <td className="p-3">{parseInt(s.bookings) || 0}</td>
                  <td className="p-3">{formatPrice(parseInt(s.revenue) || 0)} تومان</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-success/10 text-success">فعال</span>
                  </td>
                  <td className="p-3"><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
