"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Store, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4;

interface SalonData {
  name: string;
  slug: string;
  phone: string;
  address: string;
  description: string;
  working_hours: Record<string, { open: string; close: string } | null>;
}

const DEFAULT_HOURS = {
  sat: { open: "10:00", close: "18:00" },
  sun: { open: "10:00", close: "18:00" },
  mon: { open: "10:00", close: "18:00" },
  tue: { open: "10:00", close: "18:00" },
  wed: { open: "10:00", close: "18:00" },
  thu: { open: "10:00", close: "18:00" },
  fri: null,
};

const DAY_NAMES: Record<string, string> = {
  sat: "شنبه", sun: "یکشنبه", mon: "دوشنبه",
  tue: "سه‌شنبه", wed: "چهارشنبه", thu: "پنجشنبه", fri: "جمعه",
};

export default function NewSalonPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [creating, setCreating] = useState(false);
  const [salonId, setSalonId] = useState("");
  const [salonSlug, setSalonSlug] = useState("");

  const [data, setData] = useState<SalonData>({
    name: "",
    slug: "",
    phone: "",
    address: "",
    description: "",
    working_hours: DEFAULT_HOURS,
  });

  const updateField = (field: keyof SalonData, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/salons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          slug: data.slug,
          phone: data.phone,
          address: data.address,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "خطا در ایجاد سالن");
        return;
      }
      setSalonId(result.salon.id);
      setSalonSlug(result.salon.slug);
      setStep(4);
      toast.success("سالن با موفقیت ایجاد شد");
    } catch {
      toast.error("خطای سرور");
    }
    setCreating(false);
  };

  const steps = [
    { num: 1, label: "اطلاعات پایه" },
    { num: 2, label: "اطلاعات تماس" },
    { num: 3, label: "ساعات کاری" },
    { num: 4, label: "تکمیل" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/salons")} className="rounded-full">
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-extrabold">سالن جدید</h2>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {step > s.num ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className={`text-xs hidden md:block ${step >= s.num ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > s.num ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="p-5 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold">اطلاعات پایه سالن</h3>
          <div>
            <Label>نام سالن *</Label>
            <Input
              value={data.name}
              onChange={(e) => {
                updateField("name", e.target.value);
                if (!data.slug) {
                  updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, "-").replace(/-+/g, "-"));
                }
              }}
              placeholder="مثال: استدیو ناخن فورهند"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Slug (آدرس URL)</Label>
            <Input
              value={data.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="forehand-nail"
              className="mt-1"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground mt-1">
              آدرس سایت: {data.slug || "..."}.vercel.app
            </p>
          </div>
          <div>
            <Label>توضیحات (اختیاری)</Label>
            <Input
              value={data.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="توضیحات کوتاه درباره سالن"
              className="mt-1"
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!data.name} className="rounded-full gap-2">
              ادامه
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Contact Info */}
      {step === 2 && (
        <div className="p-5 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold">اطلاعات تماس</h3>
          <div>
            <Label>تلفن سالن</Label>
            <Input
              value={data.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="09121234567"
              dir="ltr"
              className="mt-1"
            />
          </div>
          <div>
            <Label>آدرس</Label>
            <Input
              value={data.address}
              onChange={(e) => updateField("address", e.target.value)}
              placeholder="مشهد، خیابان ..."
              className="mt-1"
            />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)} className="rounded-full gap-2">
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Button>
            <Button onClick={() => setStep(3)} className="rounded-full gap-2">
              ادامه
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Working Hours */}
      {step === 3 && (
        <div className="p-5 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold">ساعات کاری</h3>
          <p className="text-sm text-muted-foreground">ساعات کاری پیش‌فرض تنظیم شده. می‌توانید بعداً تغییر دهید.</p>
          <div className="space-y-2">
            {Object.entries(DAY_NAMES).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <span className="text-sm font-medium">{label}</span>
                {data.working_hours[key] ? (
                  <span className="text-sm text-muted-foreground">
                    {data.working_hours[key]!.open} - {data.working_hours[key]!.close}
                  </span>
                ) : (
                  <span className="text-sm text-destructive">تعطیل</span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)} className="rounded-full gap-2">
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Button>
            <Button onClick={() => setStep(4)} className="rounded-full gap-2">
              ادامه
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Create */}
      {step === 4 && !salonId && (
        <div className="p-5 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold">بررسی و ایجاد</h3>
          <div className="space-y-3">
            <InfoRow label="نام" value={data.name} />
            <InfoRow label="Slug" value={data.slug || "خودکار"} />
            <InfoRow label="تلفن" value={data.phone || "ندارد"} />
            <InfoRow label="آدرس" value={data.address || "ندارد"} />
            <InfoRow label="توضیحات" value={data.description || "ندارد"} />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)} className="rounded-full gap-2">
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="rounded-full gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {creating ? "در حال ایجاد..." : "ایجاد سالن"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && salonId && (
        <div className="p-5 rounded-2xl border border-success/30 bg-success/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-bold">سالن ایجاد شد</h3>
              <p className="text-sm text-muted-foreground">{data.name}</p>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 space-y-2">
            <InfoRow label="شناسه" value={salonId} mono />
            <InfoRow label="آدرس سایت" value={`${salonSlug}.vercel.app`} />
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-sm">
            <p className="font-bold mb-1">مرحله بعدی:</p>
            <p className="text-muted-foreground">
              برای راه‌اندازی سایت این سالن، یک پروژه Vercel جدید ایجاد کنید و متغیر محیطی زیر را تنظیم کنید:
            </p>
            <code className="text-xs bg-background px-2 py-1 rounded-lg mt-2 inline-block" dir="ltr">
              SALON_ID={salonId}
            </code>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push(`/admin/salons/${salonId}`)} className="rounded-full">
              مدیریت سالن
            </Button>
            <Button variant="ghost" onClick={() => router.push("/admin/salons")} className="rounded-full">
              بازگشت به لیست
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm ${mono ? "font-mono" : ""}`} dir="ltr">{value}</span>
    </div>
  );
}
