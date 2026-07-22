"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminImportPage() {
  const [name, setName] = useState("استدیو تخصصی ناخن فورهند");
  const [slug, setSlug] = useState("forehand-nail");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [salonId, setSalonId] = useState("");

  const handleImport = async () => {
    if (!name.trim()) {
      toast.error("نام سالن الزامی است");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/import-salon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "خطا در ایمپورت");
        return;
      }

      setResults(data.results || []);
      setSalonId(data.salon?.id || "");
      setDone(true);
      toast.success("ایمپورت با موفقیت انجام شد");
    } catch {
      toast.error("خطای سرور");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground">ایمپورت سالن موجود</h2>

      <Card className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          اطلاعات سالن فعلی (Forehand Nail) را وارد سیستم multi-tenant وارد می‌کند.
          تمام دادههای موجود (کاربران، خدمات، رزروها) حفظ می‌شوند.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>نام سالن</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={done}
            />
          </div>
          <div>
            <Label>Slug (آدرس URL)</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={done}
              dir="ltr"
            />
          </div>
        </div>

        {!done ? (
          <Button onClick={handleImport} disabled={importing} className="gap-2">
            <Download className="h-4 w-4" />
            {importing ? "در حال ایمپورت..." : "ایمپورت کن"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle className="h-5 w-5" />
              <span className="font-bold">ایمپورت با موفقیت انجام شد</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-bold mb-2">Salon ID:</p>
              <code className="text-sm bg-background px-2 py-1 rounded" dir="ltr">{salonId}</code>
            </div>

            <div className="text-sm space-y-1">
              {results.map((r, i) => (
                <p key={i} className={r.includes("error") || r.includes("خطا") ? "text-destructive" : "text-muted-foreground"}>
                  {r}
                </p>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-primary/10 text-sm">
              <p className="font-bold mb-1">مرحله بعدی:</p>
              <p className="text-muted-foreground">
                این Salon ID را در پروژه Vercel مربوط به Forehand Nail تنظیم کنید:
              </p>
              <code className="text-xs bg-background px-2 py-1 rounded mt-1 inline-block" dir="ltr">
                SALON_ID={salonId}
              </code>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
