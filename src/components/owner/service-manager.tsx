"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, X, Check, ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service, Addon } from "@/lib/mock-data";

interface ServiceManagerProps {
  services: Service[];
  addons: Addon[];
  onUpdateServices: (services: Service[]) => void;
  onUpdateAddons: (addons: Addon[]) => void;
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

function ServicesTab({
  services,
  addons,
  onUpdate,
}: {
  services: Service[];
  addons: Addon[];
  onUpdate: (services: Service[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingServices, setPendingServices] = useState<Service[]>(services);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 45,
    price: 0,
    priority_score: 5,
  });

  // Sync when parent services change
  useEffect(() => {
    setPendingServices(services);
    setHasChanges(false);
  }, [services]);

  const markChanged = () => setHasChanges(true);

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pendingServices];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((s, i) => s.sort_order = i + 1);
    setPendingServices(updated);
    markChanged();
  };

  const handleMoveDown = (index: number) => {
    if (index === pendingServices.length - 1) return;
    const updated = [...pendingServices];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((s, i) => s.sort_order = i + 1);
    setPendingServices(updated);
    markChanged();
  };

  const handleAdd = () => {
    if (!form.name) return;
    const newService: Service = {
      id: Date.now().toString(),
      ...form,
      is_active: true,
      sort_order: pendingServices.length + 1,
      addon_ids: [],
    };
    setPendingServices([...pendingServices, newService]);
    setForm({ name: "", description: "", duration_minutes: 45, price: 0, priority_score: 5 });
    setIsAdding(false);
    markChanged();
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setPendingServices(pendingServices.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
    setEditingId(null);
    setForm({ name: "", description: "", duration_minutes: 45, price: 0, priority_score: 5 });
    markChanged();
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(pendingServices);
    setIsSaving(false);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setPendingServices(services);
    setHasChanges(false);
    setEditingId(null);
    setIsAdding(false);
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

  const handleDelete = (id: string) => {
    setPendingServices(pendingServices.filter((s) => s.id !== id));
    markChanged();
  };

  const handleToggleActive = (id: string) => {
    setPendingServices(pendingServices.map((s) => (s.id === id ? { ...s, is_active: !s.is_active } : s)));
    markChanged();
  };

  const handleToggleAddon = (serviceId: string, addonId: string) => {
    setPendingServices(
      pendingServices.map((s) => {
        if (s.id !== serviceId) return s;
        const has = s.addon_ids.includes(addonId);
        return {
          ...s,
          addon_ids: has
            ? s.addon_ids.filter((id) => id !== addonId)
            : [...s.addon_ids, addonId],
        };
      })
    );
    markChanged();
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
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-sm">خدمت جدید</p>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
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
          <div className="grid grid-cols-2 gap-3">
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
            <Button size="sm" onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
              ذخیره
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
              انصراف
            </Button>
          </div>
        </Card>
      )}

      {pendingServices.map((service, index) => (
        <Card key={service.id} className="p-4">
          {editingId === service.id ? (
            <div className="space-y-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>ذخیره</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>انصراف</Button>
              </div>
            </div>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === pendingServices.length - 1}
                    className="h-8 w-8 p-0"
                  >
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

      {/* Save/Discard buttons */}
      {hasChanges && (
        <div className="flex gap-3 sticky bottom-20 z-10">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-12"
          >
            {isSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isSaving}
            className="flex-1 rounded-xl h-12"
          >
            انصراف
          </Button>
        </div>
      )}
    </div>
  );
}

function AddonsTab({
  addons,
  onUpdate,
}: {
  addons: Addon[];
  onUpdate: (addons: Addon[]) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAddons, setPendingAddons] = useState<Addon[]>(addons);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    price: 0,
    duration_minutes: 5,
  });

  useEffect(() => {
    setPendingAddons(addons);
    setHasChanges(false);
  }, [addons]);

  const markChanged = () => setHasChanges(true);

  const handleAdd = () => {
    if (!form.name) return;
    const newAddon: Addon = {
      id: Date.now().toString(),
      name: form.name,
      price: form.price,
      duration_minutes: form.duration_minutes,
      is_active: true,
    };
    setPendingAddons([...pendingAddons, newAddon]);
    setForm({ name: "", price: 0, duration_minutes: 5 });
    setIsAdding(false);
    markChanged();
  };

  const handleEdit = (addon: Addon) => {
    setEditingId(addon.id);
    setForm({
      name: addon.name,
      price: addon.price,
      duration_minutes: addon.duration_minutes,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setPendingAddons(pendingAddons.map((a) => (a.id === editingId ? { ...a, ...form } : a)));
    setEditingId(null);
    setForm({ name: "", price: 0, duration_minutes: 5 });
    markChanged();
  };

  const handleDelete = (id: string) => {
    setPendingAddons(pendingAddons.filter((a) => a.id !== id));
    markChanged();
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...pendingAddons];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    setPendingAddons(updated);
    markChanged();
  };

  const handleMoveDown = (index: number) => {
    if (index === pendingAddons.length - 1) return;
    const updated = [...pendingAddons];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setPendingAddons(updated);
    markChanged();
  };

  const handleToggleActive = (id: string) => {
    setPendingAddons(pendingAddons.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a)));
    markChanged();
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(pendingAddons);
    setIsSaving(false);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setPendingAddons(addons);
    setHasChanges(false);
    setEditingId(null);
    setIsAdding(false);
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
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-sm">آپشن جدید</p>
            <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
            <Button size="sm" onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-white rounded-xl">
              ذخیره
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
              انصراف
            </Button>
          </div>
        </Card>
      )}

      {pendingAddons.map((addon, index) => (
        <Card key={addon.id} className="p-4">
          {editingId === addon.id ? (
            <div className="space-y-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                />
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>ذخیره</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>انصراف</Button>
              </div>
            </div>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === pendingAddons.length - 1}
                    className="h-8 w-8 p-0"
                  >
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

      {/* Save/Discard buttons */}
      {hasChanges && (
        <div className="flex gap-3 sticky bottom-20 z-10">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl h-12"
          >
            {isSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={isSaving}
            className="flex-1 rounded-xl h-12"
          >
            انصراف
          </Button>
        </div>
      )}
    </div>
  );
}
