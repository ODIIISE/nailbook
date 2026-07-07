"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, X, Check, ChevronUp, ChevronDown } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service, Addon } from "@/lib/mock-data";

interface ServiceManagerProps {
  services: Service[];
  addons: Addon[];
  onUpdateServices: (services: Service[]) => Promise<boolean>;
  onUpdateAddons: (addons: Addon[]) => Promise<boolean>;
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
  onUpdate: (services: Service[]) => Promise<boolean>;
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
  });

  useEffect(() => {
    setPending(services);
    setHasChanges(false);
  }, [services]);

  const markChanged = () => setHasChanges(true);

  const resetForm = () => setForm({ name: "", description: "", duration_minutes: 45, price: 0, priority_score: 5 });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const newService: Service = {
      id: crypto.randomUUID(),
      ...form,
      is_active: true,
      sort_order: pending.length + 1,
      addon_ids: [],
    };
    setPending([...pending, newService]);
    resetForm();
    setIsAdding(false);
    markChanged();
  };

  const handleSaveEdit = () => {
    if (!editingId || !form.name.trim()) return;
    setPending(pending.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
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
    const ok = await onUpdate(pending);
    setIsSaving(false);
    if (ok) {
      setHasChanges(false);
    } else {
      setSaveError("ذخیره ناموفق بود. لطفاً دوباره تلاش کنید.");
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
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{service.name}</span>
                    {!service.is_active && (
                      <Badge variant="secondary" className="text-xs">غیرفعال</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {toPersianDigits(service.duration_minutes)} دقیقه ·{" "}
                    {toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان
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
  onUpdate: (addons: Addon[]) => Promise<boolean>;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<Addon[]>(addons);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: 0, duration_minutes: 5 });

  useEffect(() => {
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
    setPending(pending.map((a) => (a.id === editingId ? { ...a, ...form } : a)));
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
    const ok = await onUpdate(pending);
    setIsSaving(false);
    if (ok) {
      setHasChanges(false);
    } else {
      setSaveError("ذخیره ناموفق بود. لطفاً دوباره تلاش کنید.");
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
                  +{toPersianDigits(addon.price.toLocaleString("fa-IR"))} تومان
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
  form: { name: string; description: string; duration_minutes: number; price: number; priority_score: number };
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
        placeholder="نام خدمت"
      />
      <Input
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="توضیحات"
      />
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">مدت (دقیقه)</Label>
          <Input
            type="number"
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">قیمت (تومان)</Label>
          <Input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
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
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">قیمت اضافه (تومان)</Label>
          <Input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
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
