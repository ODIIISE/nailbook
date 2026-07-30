"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, X, Check, ChevronUp, ChevronDown, Upload, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Service, Addon } from "@/lib/types";

interface ServiceManagerProps {
  services: Service[];
  addons: Addon[];
  onUpdateServices: (services: Service[]) => Promise<string | null>;
  onUpdateAddons: (addons: Addon[]) => Promise<string | null>;
}

export function ServiceManager({
  services,
  addons,
  onUpdateServices,
  onUpdateAddons,
}: ServiceManagerProps) {
  const [tab, setTab] = useState("services");

  return (
    <div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="services" className="flex-1">
            خدمات ({toPersianDigits(services.length)})
          </TabsTrigger>
          <TabsTrigger value="addons" className="flex-1">
            آپشن‌ها ({toPersianDigits(addons.length)})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <ServicesTab
            services={services}
            addons={addons}
            onUpdate={onUpdateServices}
          />
        </TabsContent>

        <TabsContent value="addons">
          <AddonsTab
            addons={addons}
            onUpdate={onUpdateAddons}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Services Tab ──

function ServicesTab({
  services,
  addons,
  onUpdate,
}: {
  services: Service[];
  addons: Addon[];
  onUpdate: (services: Service[]) => Promise<string | null>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<Service[]>(services);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 45,
    price: 0,
    priority_score: 5,
    image_url: "",
    best_for: [] as string[],
  });

  useEffect(() => {
    // Sync local editing state with fresh prop data when the parent re-fetches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(services);
    setHasChanges(false);
  }, [services]);

  const markChanged = () => setHasChanges(true);

  const resetForm = () =>
    setForm({ name: "", description: "", duration_minutes: 45, price: 0, priority_score: 5, image_url: "", best_for: [] });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const newService: Service = {
      id: crypto.randomUUID(),
      ...form,
      duration_minutes: Math.max(5, form.duration_minutes || 45),
      price: Math.max(0, form.price || 0),
      priority_score: Math.min(10, Math.max(1, form.priority_score || 5)),
      is_active: true,
      sort_order: pending.length + 1,
      addon_ids: [],
      image_url: form.image_url || undefined,
      best_for: form.best_for,
    };
    setPending([...pending, newService]);
    resetForm();
    setIsAdding(false);
    markChanged();
  };

  const handleSaveEdit = () => {
    if (!editingId || !form.name.trim()) return;
    setPending(
      pending.map((s) =>
        s.id === editingId
          ? { ...s, ...form, image_url: form.image_url || s.image_url, best_for: form.best_for }
          : s
      )
    );
    setEditingId(null);
    resetForm();
    markChanged();
  };

  const handleDelete = (id: string) => {
    setPending(pending.filter((s) => s.id !== id).map((s, i) => ({ ...s, sort_order: i + 1 })));
    markChanged();
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pending];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setPending(updated.map((s, i) => ({ ...s, sort_order: i + 1 })));
    markChanged();
  };

  const handleMoveDown = (index: number) => {
    if (index === pending.length - 1) return;
    const updated = [...pending];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setPending(updated.map((s, i) => ({ ...s, sort_order: i + 1 })));
    markChanged();
  };

  const handleToggleActive = (id: string) => {
    setPending(pending.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)));
    markChanged();
  };

  const handleToggleAddon = (serviceId: string, addonId: string) => {
    setPending(
      pending.map((s) => {
        if (s.id !== serviceId) return s;
        const has = s.addon_ids.includes(addonId);
        return {
          ...s,
          addon_ids: has ? s.addon_ids.filter((id) => id !== addonId) : [...s.addon_ids, addonId],
        };
      })
    );
    markChanged();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const error = await onUpdate(pending);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      setHasChanges(false);
    }
  };

  const handleDiscard = () => {
    setPending(services);
    setHasChanges(false);
    setEditingId(null);
    setIsAdding(false);
    setSaveError(null);
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
      priority_score: service.priority_score || 5,
      image_url: service.image_url || "",
      best_for: Array.isArray(service.best_for) ? service.best_for : [],
    });
  };

  return (
    <div className="space-y-4 mt-4">
      {!isAdding && !editingId && (
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 ml-1" />
          افزودن خدمت
        </Button>
      )}

      {isAdding && (
        <ServiceForm
          form={form}
          setForm={setForm}
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
          title="خدمت جدید"
        />
      )}

      {pending.map((service, index) => (
        <Card key={service.id} className="p-4">
          {editingId === service.id ? (
            <ServiceForm
              form={form}
              setForm={setForm}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="flex items-center gap-3">
                {service.image_url ? (
                  <Image
                    src={service.image_url}
                    alt={service.name}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    {!service.is_active && (
                      <Badge variant="secondary" className="text-xs">غیرفعال</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {toPersianDigits(service.duration_minutes)} دقیقه ·{" "}
                    {formatPrice(Number(service.price))} تومان
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button size="sm" variant="ghost" onClick={() => handleMoveUp(index)} disabled={index === 0} className="h-8 w-8 p-0">
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleMoveDown(index)} disabled={index === pending.length - 1} className="h-8 w-8 p-0">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(service.id)}>
                    {service.is_active ? "غیرفعال" : "فعال"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(service)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(service.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">آپشن‌های فعال</p>
                <div className="flex flex-wrap gap-2">
                  {addons.filter((a) => a.is_active).map((addon) => {
                    const assigned = service.addon_ids.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => handleToggleAddon(service.id, addon.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          assigned
                            ? "bg-primary text-white"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {assigned && <Check className="h-3 w-3" />}
                        {addon.name}
                      </button>
                    );
                  })}
                </div>
                {addons.filter((a) => a.is_active).length === 0 && (
                  <p className="text-xs text-muted-foreground/50">ابتدا آپشن اضافه کنید</p>
                )}
              </div>
            </>
          )}
        </Card>
      ))}

      <SaveBar
        hasChanges={hasChanges}
        saveError={saveError}
        isSaving={isSaving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}

// ── Addons Tab ──

function AddonsTab({
  addons,
  onUpdate,
}: {
  addons: Addon[];
  onUpdate: (addons: Addon[]) => Promise<string | null>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<Addon[]>(addons);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: 0, duration_minutes: 5 });

  useEffect(() => {
    // Sync local editing state with fresh prop data when the parent re-fetches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(addons);
    setHasChanges(false);
  }, [addons]);

  const markChanged = () => setHasChanges(true);

  const resetForm = () => setForm({ name: "", price: 0, duration_minutes: 5 });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const newAddon: Addon = {
      id: crypto.randomUUID(),
      ...form,
      duration_minutes: Math.max(0, form.duration_minutes || 5),
      price: Math.max(0, form.price || 0),
      is_active: true,
      sort_order: pending.length + 1,
    };
    setPending([...pending, newAddon]);
    resetForm();
    setIsAdding(false);
    markChanged();
  };

  const handleSaveEdit = () => {
    if (!editingId || !form.name.trim()) return;
    setPending(pending.map((a) => (a.id === editingId ? {
      ...a,
      ...form,
      duration_minutes: Math.max(0, form.duration_minutes || 5),
      price: Math.max(0, form.price || 0),
    } : a)));
    setEditingId(null);
    resetForm();
    markChanged();
  };

  const handleDelete = (id: string) => {
    setPending(pending.filter((a) => a.id !== id).map((a, i) => ({ ...a, sort_order: i + 1 })));
    markChanged();
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pending];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setPending(updated.map((a, i) => ({ ...a, sort_order: i + 1 })));
    markChanged();
  };

  const handleMoveDown = (index: number) => {
    if (index === pending.length - 1) return;
    const updated = [...pending];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setPending(updated.map((a, i) => ({ ...a, sort_order: i + 1 })));
    markChanged();
  };

  const handleToggleActive = (id: string) => {
    setPending(pending.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a)));
    markChanged();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    const error = await onUpdate(pending);
    setIsSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      setHasChanges(false);
    }
  };

  const handleDiscard = () => {
    setPending(addons);
    setHasChanges(false);
    setEditingId(null);
    setIsAdding(false);
    setSaveError(null);
  };

  const handleEdit = (addon: Addon) => {
    setEditingId(addon.id);
    setForm({
      name: addon.name,
      price: addon.price,
      duration_minutes: addon.duration_minutes,
    });
  };

  return (
    <div className="space-y-4 mt-4">
      {!isAdding && !editingId && (
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-xl"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-4 w-4 ml-1" />
          افزودن آپشن
        </Button>
      )}

      {isAdding && (
        <AddonForm
          form={form}
          setForm={setForm}
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
          title="آپشن جدید"
        />
      )}

      {pending.map((addon, index) => (
        <Card key={addon.id} className="p-4">
          {editingId === addon.id ? (
            <AddonForm
              form={form}
              setForm={setForm}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{addon.name}</span>
                  {!addon.is_active && (
                    <Badge variant="secondary" className="text-xs">غیرفعال</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  +{toPersianDigits(addon.duration_minutes)} دقیقه ·{" "}
                  +{formatPrice(Number(addon.price))} تومان
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <Button size="sm" variant="ghost" onClick={() => handleMoveUp(index)} disabled={index === 0} className="h-8 w-8 p-0">
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleMoveDown(index)} disabled={index === pending.length - 1} className="h-8 w-8 p-0">
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleToggleActive(addon.id)}>
                  {addon.is_active ? "غیرفعال" : "فعال"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(addon)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(addon.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}

      <SaveBar
        hasChanges={hasChanges}
        saveError={saveError}
        isSaving={isSaving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}

// ── Shared sub-components ──

function ServiceForm({
  form,
  setForm,
  onSave,
  onCancel,
  title,
}: {
  form: { name: string; description: string; duration_minutes: number; price: number; priority_score: number; image_url: string; best_for: string[] };
  setForm: (f: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
  title?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-service-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "خطا در آپلود");
      }

      const data = await res.json();
      setForm({ ...form, image_url: data.url });
    } catch (error) {
      console.error("Upload error:", error);
      alert("خطا در آپلود تصویر");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-sm">{title}</p>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Upload */}
      <div className="flex items-center gap-4">
        <div
          className="relative w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          ) : form.image_url ? (
            <Image src={form.image_url} alt="" fill unoptimized className="object-cover" />
          ) : (
            <div className="text-center">
              <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">تصویر</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">تصویر خدمت</p>
          <p className="text-[10px] text-muted-foreground/60">اختیاری - حداکثر ۵ مگابایت</p>
          {form.image_url && (
            <button
              type="button"
              onClick={() => setForm({ ...form, image_url: "" })}
              className="text-xs text-destructive mt-1"
            >
              حذف تصویر
            </button>
          )}
        </div>
      </div>

      <Input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="نام خدمت"
      />
      <Input
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="توضیحات"
      />
      <BestForEditor
        tags={form.best_for}
        onChange={(tags) => setForm({ ...form, best_for: tags })}
      />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">مدت (دقیقه)</Label>
          <Input
            type="number"
            min={5}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Math.max(5, Number(e.target.value) || 5) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">قیمت (تومان)</Label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value) || 0) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">اولویت (۱-۱۰)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={form.priority_score}
            onChange={(e) => setForm({ ...form, priority_score: Math.min(10, Math.max(1, Number(e.target.value))) })}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
          ذخیره
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </Card>
  );
}

function BestForEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...tags, trimmed]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">مناسب برای (تگ‌هایی که مشتری می‌بیند)</Label>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground"
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder="مثلاً: عروس، محل کار، دانشجو — اینتر بزنید"
      />
    </div>
  );
}

function AddonForm({
  form,
  setForm,
  onSave,
  onCancel,
  title,
}: {
  form: { name: string; price: number; duration_minutes: number };
  setForm: (f: typeof form) => void;
  onSave: () => void;
  onCancel: () => void;
  title?: string;
}) {
  return (
    <Card className="p-4 space-y-3">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-sm">{title}</p>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <Input
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="نام آپشن"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">مدت اضافه (دقیقه)</Label>
          <Input
            type="number"
            min={0}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Math.max(0, Number(e.target.value) || 0) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">قیمت اضافه (تومان)</Label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value) || 0) })}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
          ذخیره
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </Card>
  );
}

function SaveBar({
  hasChanges,
  saveError,
  isSaving,
  onSave,
  onDiscard,
}: {
  hasChanges: boolean;
  saveError: string | null;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!hasChanges && !saveError) return null;

  return (
    <div className="sticky bottom-20 z-10 space-y-2">
      {saveError && (
        <p className="text-xs text-destructive text-center bg-destructive/10 rounded-xl px-3 py-2">{saveError}</p>
      )}
      <div className="flex gap-3">
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-12"
        >
          {isSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        <Button
          variant="outline"
          onClick={onDiscard}
          disabled={isSaving}
          className="flex-1 rounded-xl h-12"
        >
          انصراف
        </Button>
      </div>
    </div>
  );
}
