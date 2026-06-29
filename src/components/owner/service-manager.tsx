"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/mock-data";

interface ServiceManagerProps {
  services: Service[];
  onUpdate: (services: Service[]) => void;
}

export function ServiceManager({ services, onUpdate }: ServiceManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 45,
    price: 0,
  });

  const handleAdd = () => {
    if (!form.name) return;
    const newService: Service = {
      id: Date.now().toString(),
      ...form,
      is_active: true,
      sort_order: services.length + 1,
    };
    onUpdate([...services, newService]);
    setForm({ name: "", description: "", duration_minutes: 45, price: 0 });
    setIsAdding(false);
  };

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price: service.price,
    });
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onUpdate(
      services.map((s) =>
        s.id === editingId ? { ...s, ...form } : s
      )
    );
    setEditingId(null);
    setForm({ name: "", description: "", duration_minutes: 45, price: 0 });
  };

  const handleDelete = (id: string) => {
    onUpdate(services.filter((s) => s.id !== id));
  };

  const handleToggleActive = (id: string) => {
    onUpdate(
      services.map((s) =>
        s.id === id ? { ...s, is_active: !s.is_active } : s
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">مدیریت خدمات</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(!isAdding)}
        >
          <Plus className="h-4 w-4 ml-1" />
          افزودن
        </Button>
      </div>

      {isAdding && (
        <Card className="p-4 space-y-3">
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
                onChange={(e) =>
                  setForm({ ...form, duration_minutes: Number(e.target.value) })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">قیمت (تومان)</Label>
              <Input
                type="number"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: Number(e.target.value) })
                }
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} className="bg-rose hover:bg-rose/90 text-white">
              ذخیره
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
              انصراف
            </Button>
          </div>
        </Card>
      )}

      {services.map((service) => (
        <Card key={service.id} className="p-3">
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
                  onChange={(e) =>
                    setForm({ ...form, duration_minutes: Number(e.target.value) })
                  }
                />
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: Number(e.target.value) })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit}>
                  ذخیره
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  انصراف
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
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
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleActive(service.id)}
                >
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
          )}
        </Card>
      ))}
    </div>
  );
}
