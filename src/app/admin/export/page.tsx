"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Download, FileText, Users, Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Salon {
  id: string;
  name: string;
}

export default function AdminExportPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [selectedSalon, setSelectedSalon] = useState("");
  const [exportType, setExportType] = useState<"bookings" | "users" | "salons">("bookings");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/salons")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSalons(data);
      })
      .catch(console.error);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: exportType });
      if (selectedSalon) params.set("salon_id", selectedSalon);

      const res = await fetch(`/api/admin/export?${params}`);
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "خطا در خروجی");
        return;
      }

      if (data.count === 0) {
        toast.info("داده‌ای یافت نشد");
        return;
      }

      // Download CSV
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${exportType}-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${data.count} ردیف خروجی گرفته شد`);
    } catch {
      toast.error("خطای سرور");
    }
    setExporting(false);
  };

  const exportTypes = [
    { id: "bookings" as const, label: "رزروها", icon: FileText },
    { id: "users" as const, label: "کاربران", icon: Users },
    { id: "salons" as const, label: "سالن‌ها", icon: Store },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold">خروجی داده</h2>

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>نوع داده</Label>
            <div className="flex gap-2 mt-2">
              {exportTypes.map((t) => (
                <Button
                  key={t.id}
                  variant={exportType === t.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExportType(t.id)}
                  className="gap-1"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label>سالن (اختیاری)</Label>
            <select
              value={selectedSalon}
              onChange={(e) => setSelectedSalon(e.target.value)}
              className="w-full mt-2 h-9 px-3 rounded-md border border-border bg-background text-sm"
            >
              <option value="">همه سالن‌ها</option>
              {salons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Button onClick={handleExport} disabled={exporting} className="gap-2">
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "در حال خروجی..." : "خروجی CSV"}
        </Button>
      </Card>
    </div>
  );
}
