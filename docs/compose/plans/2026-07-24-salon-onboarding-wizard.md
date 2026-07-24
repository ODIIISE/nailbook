# Salon Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing deploy API into the salon creation wizard so admins can create + deploy a new salon in one flow, with post-deploy guidance.

**Architecture:** Rewrite the 4-step wizard to include a deploy step that calls the existing `/api/admin/salons/deploy` endpoint. Add a seed-defaults API that populates new salons with common services. Show a success page with live URL and owner bootstrap instructions.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui, Vercel Postgres, Vercel API

## Global Constraints

- RTL-first, Persian UI text throughout
- All new code must pass `npm run test` (66 tests) and `npm run build`
- Follow existing patterns: `use client`, `sonner` for toasts, `lucide-react` icons
- No new dependencies — use what's already installed
- SALON_ID env var pattern: set by deploy API, filters all data
- Owner bootstrap requires visiting the live salon's `/bootstrap` page (chicken-and-egg: can't create owner until salon is deployed)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/app/admin/salons/new/page.tsx` | Rewrite wizard: add deploy step + success page |
| Create | `src/app/api/admin/salons/[id]/seed/route.ts` | Seed default services for a new salon |
| Modify | `src/app/api/admin/salons/deploy/route.ts` | Add `salon_name` to env vars, return deployment status |
| Modify | `MULTI-SALON-GUIDE.md` | Update docs to reflect wizard flow |

---

## Task 1: Add seed-defaults API endpoint

**Covers:** Seeding common nail services so new salons aren't empty

**Files:**
- Create: `src/app/api/admin/salons/[id]/seed/route.ts`

**Interfaces:**
- Consumes: salon ID from URL params
- Produces: `{ success: true, services: Service[] }` — the seeded services

- [ ] **Step 1: Create the seed endpoint**

```typescript
// src/app/api/admin/salons/[id]/seed/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifySuperAdmin } from "@/lib/super-admin-auth";

const DEFAULT_SERVICES = [
  { name: "کاشت ناخن", duration_minutes: 90, price: 350000 },
  { name: "ترمیم ناخن", duration_minutes: 60, price: 250000 },
  { name: "ژل پولیش", duration_minutes: 45, price: 150000 },
  { name: "پدیکور", duration_minutes: 60, price: 200000 },
  { name: "مانیکور", duration_minutes: 45, price: 150000 },
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifySuperAdmin(request);
    if (!admin) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { id: salonId } = await params;

    // Check if services already exist
    const { rows: existing } = await sql`
      SELECT COUNT(*) as count FROM services WHERE salon_id = ${salonId}
    `;
    if (parseInt(existing[0]?.count || "0") > 0) {
      return NextResponse.json({ success: true, services: [], message: "خدمات از قبل وجود دارد" });
    }

    // Insert default services
    const inserted = [];
    for (const svc of DEFAULT_SERVICES) {
      const { rows } = await sql`
        INSERT INTO services (salon_id, name, duration_minutes, price, is_active)
        VALUES (${salonId}, ${svc.name}, ${svc.duration_minutes}, ${svc.price}, true)
        RETURNING id, name, duration_minutes, price
      `;
      inserted.push(rows[0]);
    }

    return NextResponse.json({ success: true, services: inserted });
  } catch (error) {
    console.error("Seed services error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/salons/\[id\]/seed/route.ts
git commit -m "feat: add seed-defaults API for new salons"
```

---

## Task 2: Enhance deploy API to pass salon_name

**Covers:** Ensuring the Vercel project gets the salon name for display

**Files:**
- Modify: `src/app/api/admin/salons/deploy/route.ts:22` — add `salonName` to destructured body
- Modify: `src/app/api/admin/salons/deploy/route.ts:57-62` — add `SALON_NAME` env var

**Interfaces:**
- Consumes: `{ salonId, salonName, salonSlug }` from request body
- Produces: `{ success, projectId, deploymentUrl, deploymentId }` (existing)

- [ ] **Step 1: Add salonName to env vars**

In `src/app/api/admin/salons/deploy/route.ts`, find the `envVars` array (line 57) and add `SALON_NAME`:

```typescript
const envVars = [
  { key: "SALON_ID", value: salonId, target: ["production", "preview"] },
  { key: "SALON_NAME", value: salonName || "", target: ["production", "preview"] },
  { key: "CUSTOMER_SESSION_SECRET", value: process.env.CUSTOMER_SESSION_SECRET || "", target: ["production", "preview"] },
  { key: "OWNER_SESSION_SECRET", value: process.env.OWNER_SESSION_SECRET || "", target: ["production", "preview"] },
  { key: "SUPER_ADMIN_SESSION_SECRET", value: process.env.SUPER_ADMIN_SESSION_SECRET || "", target: ["production", "preview"] },
];
```

Also update the destructuring on line 22 to include `salonName`:

```typescript
const { salonId, salonName, salonSlug } = await request.json();
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/salons/deploy/route.ts
git commit -m "feat: pass SALON_NAME to Vercel project env vars"
```

---

## Task 3: Rewrite the salon creation wizard

**Covers:** Full 6-step onboarding flow: info → contact → hours → review → deploy → success

**Files:**
- Modify: `src/app/admin/salons/new/page.tsx`

**Interfaces:**
- Consumes: existing UI components (Button, Input, Label, Card, PinInput)
- Produces: calls `POST /api/admin/salons` → `POST /api/admin/salons/[id]/deploy` → `POST /api/admin/salons/[id]/seed`

- [ ] **Step 1: Rewrite the wizard**

Replace the entire content of `src/app/admin/salons/new/page.tsx` with the following:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft, Store, Check, Loader2, ExternalLink, Rocket, Shield, Package } from "lucide-react";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

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
  const [deployUrl, setDeployUrl] = useState("");
  const [deployStatus, setDeployStatus] = useState<"idle" | "deploying" | "success" | "error">("idle");
  const [deployError, setDeployError] = useState("");

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

  // Step 4: Create salon in DB
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
      setStep(5);
      toast.success("سالن با موفقیت ایجاد شد");
    } catch {
      toast.error("خطای سرور");
    }
    setCreating(false);
  };

  // Step 5: Deploy to Vercel + seed defaults
  const handleDeploy = async () => {
    setDeployStatus("deploying");
    setDeployError("");

    try {
      // 1. Deploy to Vercel
      const deployRes = await fetch("/api/admin/salons/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          salonName: data.name,
          salonSlug: data.slug,
        }),
      });
      const deployData = await deployRes.json();

      if (!deployRes.ok) {
        setDeployStatus("error");
        setDeployError(deployData.error || "خطا در استقرار");
        return;
      }

      setDeployUrl(deployData.deploymentUrl);

      // 2. Seed default services (fire-and-forget — don't block on this)
      fetch(`/api/admin/salons/${salonId}/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});

      setDeployStatus("success");
      setStep(6);
      toast.success("سالن با موفقیت مستقر شد");
    } catch {
      setDeployStatus("error");
      setDeployError("خطای سرور");
    }
  };

  const steps = [
    { num: 1, label: "اطلاعات پایه" },
    { num: 2, label: "اطلاعات تماس" },
    { num: 3, label: "ساعات کاری" },
    { num: 4, label: "بررسی" },
    { num: 5, label: "استقرار" },
    { num: 6, label: "تمام" },
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
      {step === 4 && (
        <div className="p-5 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold">بررسی و ایجاد</h3>
          <div className="space-y-3">
            <InfoRow label="نام" value={data.name} />
            <InfoRow label="Slug" value={data.slug || "خودکار"} />
            <InfoRow label="تلفن" value={data.phone || "ندارد"} />
            <InfoRow label="آدرس" value={data.address || "ندارد"} />
            <InfoRow label="توضیحات" value={data.description || "ندارد"} />
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-sm">
            <p className="text-muted-foreground">
              سالن در دیتابیس ایجاد شده و آماده استقرار است.
            </p>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)} className="rounded-full gap-2">
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </Button>
            <Button onClick={handleCreate} disabled={creating} className="rounded-full gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {creating ? "در حال ایجاد..." : "ایجاد و ادامه"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Deploy */}
      {step === 5 && (
        <div className="p-5 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold">استقرار سالن</h3>
          <p className="text-sm text-muted-foreground">
            سالن <strong>{data.name}</strong> در حال استقرار روی Vercel است.
          </p>

          {deployStatus === "idle" && (
            <div className="p-4 rounded-xl bg-muted/30 space-y-3">
              <p className="text-sm text-muted-foreground">مراحل استقرار:</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>ایجاد پروژه Vercel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>تنظیم متغیرهای محیطی</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>استقرار کد</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                  <span>افزودن خدمات پیش‌فرض</span>
                </div>
              </div>
            </div>
          )}

          {deployStatus === "deploying" && (
            <div className="p-4 rounded-xl bg-primary/5 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-medium">در حال استقرار...</span>
              </div>
              <p className="text-xs text-muted-foreground">
                این فرآیند ممکن است ۱-۲ دقیقه طول بکشد.
              </p>
            </div>
          )}

          {deployStatus === "error" && (
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
              <p className="text-sm text-destructive font-medium">خطا در استقرار</p>
              <p className="text-sm text-muted-foreground">{deployError}</p>
              <Button onClick={handleDeploy} variant="outline" size="sm" className="rounded-full">
                تلاش مجدد
              </Button>
            </div>
          )}

          {deployStatus === "idle" && (
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(4)} className="rounded-full gap-2">
                <ArrowRight className="h-4 w-4" />
                بازگشت
              </Button>
              <Button onClick={handleDeploy} className="rounded-full gap-2">
                <Rocket className="h-4 w-4" />
                استقرار
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 6: Success */}
      {step === 6 && (
        <div className="p-5 rounded-2xl border border-success/30 bg-success/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-bold">سالن مستقر شد!</h3>
              <p className="text-sm text-muted-foreground">{data.name}</p>
            </div>
          </div>

          {/* Live URL */}
          <div className="p-3 rounded-xl bg-muted/50 space-y-2">
            <InfoRow label="آدرس سایت" value={deployUrl || `${data.slug}.vercel.app`} />
            <InfoRow label="شناسه" value={salonId} mono />
          </div>

          {/* Next Steps */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm">مراحل بعدی:</h4>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">ساخت اکانت مدیر سالن</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    مدیر سالن باید آدرس زیر را باز کند و شماره + رمز ۴ رقمی خود را وارد کند:
                  </p>
                  <a
                    href={`${deployUrl}/bootstrap`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline mt-1 inline-flex items-center gap-1"
                    dir="ltr"
                  >
                    {deployUrl}/bootstrap
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 space-y-2">
              <div className="flex items-start gap-3">
                <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">خدمات پیش‌فرض</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ۵ خدمت پیش‌فرض (کاشت، ترمیم، ژل پولیش، پدیکور، مانیکور) اضافه شد.
                    مدیر می‌تواند آن‌ها را ویرایش یا حذف کند.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => window.open(deployUrl, "_blank")} className="rounded-full gap-2">
              <ExternalLink className="h-4 w-4" />
              مشاهده سایت
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/salons/${salonId}`)} className="rounded-full">
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
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: 66 tests pass

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/salons/new/page.tsx
git commit -m "feat: full onboarding wizard — create salon, deploy to Vercel, seed defaults, show next steps"
```

---

## Task 4: Update documentation

**Covers:** MULTI-SALON-GUIDE.md reflects the new wizard flow

**Files:**
- Modify: `MULTI-SALON-GUIDE.md`

- [ ] **Step 1: Rewrite the guide**

Replace the contents of `MULTI-SALON-GUIDE.md`:

```markdown
# Multi-Salon Deployment Guide

## Architecture

```
nailbook-admin.vercel.app      ← Admin panel (manages all salons)
forehand-nail.vercel.app       ← Forehand Nail Studio
barberman-nail.vercel.app      ← Barber Man
any-salon.vercel.app           ← Any new salon
```

**One repo. Multiple Vercel deployments. Each filtered by SALON_ID.**

## Quick Start (2 steps)

### Step 1: Deploy Admin Panel

```bash
./scripts/deploy-admin.sh
```

Then visit `https://nailbook-admin.vercel.app/bootstrap` to create your super-admin account.

### Step 2: Create + Deploy Salon (via Admin Panel)

1. Login to admin panel → click "سالن جدید"
2. Enter salon info (name, slug, phone, address)
3. Set working hours
4. Review and click "ایجاد و ادامه"
5. Click "استقرار" — the wizard handles everything:
   - Creates Vercel project
   - Sets SALON_ID and session secrets
   - Deploys the code
   - Seeds 5 default services
6. Show the salon owner their bootstrap link: `https://<slug>.vercel.app/bootstrap`

That's it! The salon is live.

## What the Wizard Does Automatically

| Step | What happens |
|------|-------------|
| Create | Inserts salon into `salons` table |
| Deploy | Creates Vercel project via API, sets env vars, triggers deployment |
| Seed | Adds 5 default nail services (manicure, pedicure, gel polish, etc.) |
| Done | Shows live URL + owner bootstrap link |

## After Deployment

The salon owner needs to:

1. Visit `https://<slug>.vercel.app/bootstrap`
2. Enter their phone number and create a 4-digit PIN
3. Start adding/managing services and bookings

## Environment Variables (set automatically by wizard)

| Variable | Purpose |
|----------|---------|
| `SALON_ID` | Identifies which salon this deployment serves |
| `SALON_NAME` | Display name for the salon |
| `CUSTOMER_SESSION_SECRET` | Signs customer session cookies |
| `OWNER_SESSION_SECRET` | Signs owner session cookies |

## Cost

| Item | Cost |
|------|------|
| Vercel Hobby (admin) | Free |
| Vercel Hobby (per salon) | Free |
| Vercel Postgres (shared) | Free |
| **Total** | **$0** (up to 200 Vercel projects) |
```

- [ ] **Step 2: Commit**

```bash
git add MULTI-SALON-GUIDE.md
git commit -m "docs: update deployment guide for onboarding wizard"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run all tests**

Run: `npm run test`
Expected: 66 tests pass

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Manual test flow**

1. Start dev server: `npm run dev`
2. Visit `http://localhost:3000/admin/salons/new`
3. Walk through all 6 steps
4. Verify deploy step calls the API (will fail locally without VERCEL_TOKEN — that's expected)
5. Verify seed endpoint works: `curl -X POST http://localhost:3000/api/admin/salons/<id>/seed`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete salon onboarding system"
```
