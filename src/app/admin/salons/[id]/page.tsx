"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Users, Calendar, Settings, Store, Search, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tab = "overview" | "users" | "bookings" | "services" | "settings";

interface Salon {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  description: string;
  is_active: boolean;
  user_count: number;
  booking_count: number;
  service_count: number;
  created_at: string;
}

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  created_at: string;
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  date_gregorian: string;
  start_time: string;
  end_time: string;
  status: string;
  paid: boolean;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

export default function SalonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/salons/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          router.push("/admin/salons");
        } else {
          setSalon(data);
        }
      })
      .catch(() => toast.error("خطای سرور"))
      .finally(() => setIsLoading(false));
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!salon) return null;

  const tabs: { id: Tab; label: string; icon: typeof Store }[] = [
    { id: "overview", label: " overview", icon: Store },
    { id: "users", label: "کاربران", icon: Users },
    { id: "bookings", label: "رزروها", icon: Calendar },
    { id: "services", label: "خدمات", icon: Store },
    { id: "settings", label: "تنظیمات", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/salons")}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{salon.name}</h2>
          <p className="text-sm text-muted-foreground">{salon.address || salon.slug}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(`https://${salon.slug}.vercel.app`, "_blank")}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          مشاهده سایت
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "text-foreground border-b-2 border-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && <OverviewTab salon={salon} />}
      {tab === "users" && <UsersTab salonId={id} />}
      {tab === "bookings" && <BookingsTab salonId={id} />}
      {tab === "services" && <ServicesTab salonId={id} />}
      {tab === "settings" && <SettingsTab salon={salon} />}
    </div>
  );
}

// Overview Tab
function OverviewTab({ salon }: { salon: Salon }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">کاربران</p>
        <p className="text-2xl font-bold">{parseInt(salon.user_count as any) || 0}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">رزروها</p>
        <p className="text-2xl font-bold">{parseInt(salon.booking_count as any) || 0}</p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-muted-foreground">خدمات</p>
        <p className="text-2xl font-bold">{parseInt(salon.service_count as any) || 0}</p>
      </Card>
    </div>
  );
}

// Users Tab
function UsersTab({ salonId }: { salonId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/salons/${salonId}/users?search=${search}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [salonId, search]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام یا شماره..."
          className="ps-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">کاربری یافت نشد</Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{user.name || "بدون نام"}</p>
                <p className="text-sm text-muted-foreground" dir="ltr">{user.phone}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user.role === "owner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {user.role === "owner" ? "مدیر" : "مشتری"}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Bookings Tab
function BookingsTab({ salonId }: { salonId: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/salons/${salonId}/bookings?status=${status}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBookings(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [salonId, status]);

  const statusColors: Record<string, string> = {
    reserved: "bg-blue-100 text-blue-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-purple-100 text-purple-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {["", "reserved", "confirmed", "completed", "cancelled"].map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(s)}
          >
            {s === "" ? "همه" : s === "reserved" ? "رزرو شده" : s === "confirmed" ? "تأیید شده" : s === "completed" ? "انجام شده" : "لغو شده"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : bookings.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">رزروی یافت نشد</Card>
      ) : (
        <div className="space-y-2">
          {bookings.map((b) => (
            <Card key={b.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{b.customer_name || "مشتری"}</p>
                <p className="text-sm text-muted-foreground">{b.date_gregorian} • {b.start_time}-{b.end_time}</p>
              </div>
              <div className="flex items-center gap-2">
                {b.paid && <span className="text-xs text-success">پرداخت شده</span>}
                <span className={`px-2 py-1 rounded-full text-xs ${statusColors[b.status] || "bg-muted"}`}>
                  {b.status}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Services Tab
function ServicesTab({ salonId }: { salonId: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/salons/${salonId}/services`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setServices(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [salonId]);

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : services.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">خدمتی یافت نشد</Card>
      ) : (
        <div className="space-y-2">
          {services.map((s) => (
            <Card key={s.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.duration_minutes} دقیقه</p>
              </div>
              <div className="text-left">
                <p className="font-medium">{s.price.toLocaleString("fa-IR")} تومان</p>
                <p className={`text-xs ${s.is_active ? "text-success" : "text-muted-foreground"}`}>
                  {s.is_active ? "فعال" : "غیرفعال"}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Settings Tab
function SettingsTab({ salon }: { salon: Salon }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: salon.name,
    phone: salon.phone || "",
    address: salon.address || "",
    description: salon.description || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/salons/${salon.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("ذخیره شد");
      } else {
        toast.error("خطا در ذخیره");
      }
    } catch {
      toast.error("خطای سرور");
    }
    setSaving(false);
  };

  return (
    <Card className="p-6 space-y-4 max-w-2xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>نام سالن</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <Label>تلفن</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
        </div>
        <div className="md:col-span-2">
          <Label>آدرس</Label>
          <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="md:col-span-2">
          <Label>توضیحات</Label>
          <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
      </Button>
    </Card>
  );
}
