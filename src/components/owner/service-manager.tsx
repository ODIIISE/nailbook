"use client";

import { useState, useEffect, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Seg } from "@/components/ui/seg";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, X, Check, ChevronUp, ChevronDown, Upload, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import { persianizeError } from "@/lib/error-sanitize";
import type { Service, Addon } from "@/lib/types";

interface ServiceManagerProps {
  services: Service[];
  addons: Addon[];
  /** Live future bookings per service_id — when non-zero, delete offers
     deactivation instead (deleting NULLs those bookings server-side). */
  futureBookingCounts?: Record<string, number>;
  onUpdateServices: (services: Service[]) => Promise<string | null>;
  onUpdateAddons: (addons: Addon[]) => Promise<string | null>;
}

export function ServiceManager({
  services,
  addons,
  futureBookingCounts = {},
  onUpdateServices,
  onUpdateAddons,
}: ServiceManagerProps) {
  const [tab, setTab] = useState("services");

  return (
    <div>
      <Seg
        value={tab}
        onChange={setTab}
        label="مدیریت خدمات"
        options={[
          { value: "services", label: `خدمات (${toPersianDigits(services.length)})` },
          { value: "addons", label: `آپشن‌ها (${toPersianDigits(addons.length)})` },
        ]}
      />

      <div style={{ marginTop: 16 }}>
        {tab === "services" ? (
          <ServicesTab
            services={services}
            addons={addons}
            futureBookingCounts={futureBookingCounts}
            onUpdate={onUpdateServices}
          />
        ) : (
          <AddonsTab
            addons={addons}
            services={services}
            onUpdate={onUpdateAddons}
          />
        )}
      </div>
    </div>
  );
}

// ── Services Tab ──

function ServicesTab({
  services,
  addons,
  futureBookingCounts = {},
  onUpdate,
}: {
  services: Service[];
  addons: Addon[];
  futureBookingCounts?: Record<string, number>;
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
    icon_key: "",
    is_popular: false,
  });

  useEffect(() => {
    // AUDIT-012: restore a session-stashed draft (expiry redirect or refresh
    // mid-edit) exactly once, before the prop-sync branch can overwrite it.
    // Deferred out of the effect body (react-hooks/set-state-in-effect),
    // same pattern as the booking flow's look-preset effect.
    let draft: Service[] | null = null;
    try {
      const raw = sessionStorage.getItem("nailbook_services_draft");
      if (raw) {
        const d = JSON.parse(raw) as { pending?: Service[] };
        if (Array.isArray(d.pending)) draft = d.pending;
      }
    } catch { /* corrupt or unavailable — start clean */ }
    if (draft) {
      queueMicrotask(() => {
        setPending(draft);
        setHasChanges(true);
      });
      sessionStorage.removeItem("nailbook_services_draft");
      return;
    }
    // Sync local editing state with fresh prop data when the parent re-fetches
    // — but never while the owner has unsaved edits: a failed save rolls the
    // props back, and unconditional syncing here would silently erase every
    // pending change. (schedule-manager has the same guard.)
    if (hasChanges) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(services);
    setHasChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

  const markChanged = (next?: Service[]) => {
    setPending((prev) => {
      const snapshot = next ?? prev;
      try { sessionStorage.setItem("nailbook_services_draft", JSON.stringify({ pending: snapshot })); } catch { /* private mode */ }
      return next ?? prev;
    });
    setHasChanges(true);
  };

  const resetForm = () =>
    setForm({ name: "", description: "", duration_minutes: 45, price: 0, priority_score: 5, image_url: "", best_for: [], icon_key: "", is_popular: false });

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
      icon_key: form.icon_key || null,
      is_popular: form.is_popular,
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
          ? { ...s, ...form, image_url: form.image_url, best_for: form.best_for, icon_key: form.icon_key || null, is_popular: form.is_popular }
          : s
      )
    );
    setEditingId(null);
    resetForm();
    markChanged();
  };

  // Deleting a service NULLs its bookings' service_id server-side, which
  // blanks those bookings' name and re-prices them to 0 in earnings. When
  // live future bookings exist, offer deactivation instead so they stay
  // intact (v-2 delete guard); otherwise confirm a plain delete.
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; future: number } | null>(null);

  const handleDelete = (id: string) => {
    const service = pending.find((s) => s.id === id);
    setConfirmDelete({ id, name: service?.name || "", future: futureBookingCounts[id] || 0 });
  };

  const confirmDeleteTarget = () => {
    if (!confirmDelete) return;
    if (confirmDelete.future > 0) {
      setPending(pending.map((s) => s.id === confirmDelete.id ? { ...s, is_active: false } : s));
    } else {
      setPending(pending.filter((s) => s.id !== confirmDelete.id).map((s, i) => ({ ...s, sort_order: i + 1 })));
    }
    setConfirmDelete(null);
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
      try { sessionStorage.removeItem("nailbook_services_draft"); } catch { /* noop */ }
      setHasChanges(false);
    }
  };

  const handleDiscard = () => {
    try { sessionStorage.removeItem("nailbook_services_draft"); } catch { /* noop */ }
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
      icon_key: service.icon_key || "",
      is_popular: service.is_popular === true,
    });
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <DeleteConfirmDialog target={confirmDelete} kind="service" onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteTarget} />
      {!isAdding && !editingId && (
        <button
          type="button"
          className="btn pri block"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
          افزودن خدمت
        </button>
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
        <div key={service.id} className="panel">
          {editingId === service.id ? (
            <ServiceForm
              form={form}
              setForm={setForm}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <>
              <div className="row">
                {service.image_url ? (
                  <Image
                    src={service.image_url}
                    alt={service.name}
                    width={48}
                    height={48}
                    unoptimized
                    style={{ width: 48, height: 48, borderRadius: 14, objectFit: "cover", flex: "none" }}
                  />
                ) : (
                  <span className="nail" style={{ width: 48, height: 48 }}>
                    <ImageIcon size={20} strokeWidth={1.4} aria-hidden="true" style={{ color: "var(--faint)" }} />
                  </span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{service.name}</span>
                    {!service.is_active && (
                      <span className="badge tone-mute">غیرفعال</span>
                    )}
                  </div>
                  <p className="t-s num" style={{ marginTop: 2 }}>
                    {toPersianDigits(service.duration_minutes)} دقیقه ·{" "}
                    {formatPrice(Number(service.price))}
                  </p>
                </div>
              </div>

              <div className="row" style={{ gap: 2, marginTop: 10 }}>
                <button type="button" className="iconbtn bare" onClick={() => handleMoveUp(index)} disabled={index === 0} aria-label="انتقال به بالا">
                  <ChevronUp size={18} strokeWidth={1.5} />
                </button>
                <button type="button" className="iconbtn bare" onClick={() => handleMoveDown(index)} disabled={index === pending.length - 1} aria-label="انتقال به پایین">
                  <ChevronDown size={18} strokeWidth={1.5} />
                </button>
                <span style={{ flex: 1 }} />
                <button type="button" className="btn ghost sm" onClick={() => handleToggleActive(service.id)}>
                  {service.is_active ? "غیرفعال" : "فعال"}
                </button>
                <button type="button" className="iconbtn bare" onClick={() => handleEdit(service)} aria-label={`ویرایش ${service.name}`}>
                  <Edit2 size={17} strokeWidth={1.5} />
                </button>
                <button type="button" className="iconbtn bare" onClick={() => handleDelete(service.id)} aria-label={`حذف ${service.name}`}>
                  <Trash2 size={17} strokeWidth={1.5} style={{ color: "var(--wine-hi)" }} />
                </button>
              </div>

              <div style={{ marginTop: 12 }}>
                <p className="t-s" style={{ marginBottom: 8 }}>آپشن‌های فعال</p>
                <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                  {addons.filter((a) => a.is_active).map((addon) => {
                    const assigned = service.addon_ids.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        aria-pressed={assigned}
                        onClick={() => handleToggleAddon(service.id, addon.id)}
                        className={`chip${assigned ? " on" : ""}`}
                      >
                        {assigned && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                        {addon.name}
                      </button>
                    );
                  })}
                </div>
                {addons.filter((a) => a.is_active).length === 0 && (
                  <p className="t-s">ابتدا آپشن اضافه کنید</p>
                )}
              </div>
            </>
          )}
        </div>
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
  services,
  onUpdate,
}: {
  addons: Addon[];
  services: Service[];
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
    // AUDIT-012: same draft restore as the services tab.
    let draft: Addon[] | null = null;
    try {
      const raw = sessionStorage.getItem("nailbook_addons_draft");
      if (raw) {
        const d = JSON.parse(raw) as { pending?: Addon[] };
        if (Array.isArray(d.pending)) draft = d.pending;
      }
    } catch { /* corrupt or unavailable — start clean */ }
    if (draft) {
      queueMicrotask(() => {
        setPending(draft);
        setHasChanges(true);
      });
      sessionStorage.removeItem("nailbook_addons_draft");
      return;
    }
    // Same unsaved-edits guard as the services tab.
    if (hasChanges) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending(addons);
    setHasChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addons]);

  const markChanged = (next?: Addon[]) => {
    setPending((prev) => {
      const snapshot = next ?? prev;
      try { sessionStorage.setItem("nailbook_addons_draft", JSON.stringify({ pending: snapshot })); } catch { /* private mode */ }
      return next ?? prev;
    });
    setHasChanges(true);
  };

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

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string) => {
    const addon = pending.find((a) => a.id === id);
    setConfirmDelete({ id, name: addon?.name || "" });
  };

  const confirmDeleteTarget = () => {
    if (!confirmDelete) return;
    setPending(pending.filter((a) => a.id !== confirmDelete.id).map((a, i) => ({ ...a, sort_order: i + 1 })));
    setConfirmDelete(null);
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
      try { sessionStorage.removeItem("nailbook_addons_draft"); } catch { /* noop */ }
      setHasChanges(false);
    }
  };

  const handleDiscard = () => {
    try { sessionStorage.removeItem("nailbook_addons_draft"); } catch { /* noop */ }
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
    <div style={{ display: "grid", gap: 14 }}>
      <DeleteConfirmDialog target={confirmDelete} kind="addon" onCancel={() => setConfirmDelete(null)} onConfirm={confirmDeleteTarget} />
      {!isAdding && !editingId && (
        <button
          type="button"
          className="btn pri block"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={17} strokeWidth={1.6} aria-hidden="true" />
          افزودن آپشن
        </button>
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
        <div key={addon.id} className="panel">
          {editingId === addon.id ? (
            <AddonForm
              form={form}
              setForm={setForm}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className="row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{addon.name}</span>
                  {!addon.is_active && (
                    <span className="badge tone-mute">غیرفعال</span>
                  )}
                </div>
                <p className="t-s num" style={{ marginTop: 2 }}>
                  +{toPersianDigits(addon.duration_minutes)} دقیقه ·{" "}
                  +{formatPrice(Number(addon.price))} · در {toPersianDigits(services.filter((s) => s.addon_ids.includes(addon.id)).length)} خدمت
                </p>
              </div>
              <div className="row" style={{ gap: 2 }}>
                <button type="button" className="iconbtn bare" onClick={() => handleMoveUp(index)} disabled={index === 0} aria-label="انتقال به بالا">
                  <ChevronUp size={18} strokeWidth={1.5} />
                </button>
                <button type="button" className="iconbtn bare" onClick={() => handleMoveDown(index)} disabled={index === pending.length - 1} aria-label="انتقال به پایین">
                  <ChevronDown size={18} strokeWidth={1.5} />
                </button>
                <button type="button" className="btn ghost sm" onClick={() => handleToggleActive(addon.id)}>
                  {addon.is_active ? "غیرفعال" : "فعال"}
                </button>
                <button type="button" className="iconbtn bare" onClick={() => handleEdit(addon)} aria-label={`ویرایش ${addon.name}`}>
                  <Edit2 size={17} strokeWidth={1.5} />
                </button>
                <button type="button" className="iconbtn bare" onClick={() => handleDelete(addon.id)} aria-label={`حذف ${addon.name}`}>
                  <Trash2 size={17} strokeWidth={1.5} style={{ color: "var(--wine-hi)" }} />
                </button>
              </div>
            </div>
          )}
        </div>
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
  form: { name: string; description: string; duration_minutes: number; price: number; priority_score: number; image_url: string; best_for: string[]; icon_key: string; is_popular: boolean };
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
      // P4: server upload errors are Persian; network failures would leak
      // raw English ("Failed to fetch") into the toast — sanitize.
      toast.error(persianizeError(error, "خطا در آپلود تصویر"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="panel">
      {title && (
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 16 }}>{title}</p>
          <button type="button" className="iconbtn bare" onClick={onCancel} aria-label="بستن فرم">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Image Upload */}
      <div className="row" style={{ gap: 14 }}>
        <button
          type="button"
          className="nail"
          style={{ width: 76, height: 76, borderStyle: "dashed", overflow: "hidden" }}
          onClick={() => fileInputRef.current?.click()}
          aria-label="آپلود تصویر خدمت"
        >
          {isUploading ? (
            <span className="spin" aria-hidden="true" />
          ) : form.image_url ? (
            <Image src={form.image_url} alt="" fill unoptimized style={{ objectFit: "cover" }} />
          ) : (
            <span className="center">
              <Upload size={20} strokeWidth={1.4} aria-hidden="true" style={{ color: "var(--faint)", margin: "0 auto" }} />
              <span className="t-s" style={{ display: "block", fontSize: 12 }}>تصویر</span>
            </span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: "none" }}
          aria-hidden="true"
          tabIndex={-1}
        />
        <div style={{ flex: 1 }}>
          <p className="t-s">تصویر خدمت</p>
          <p className="t-s">اختیاری - حداکثر ۵ مگابایت</p>
          {form.image_url && (
            <button
              type="button"
              onClick={() => setForm({ ...form, image_url: "" })}
              className="t-s"
              style={{ color: "var(--wine-hi)", marginTop: 4 }}
            >
              حذف تصویر
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <input
          className="input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="نام خدمت"
          aria-label="نام خدمت"
        />
        <input
          className="input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="توضیحات"
          aria-label="توضیحات"
        />
        <BestForEditor
          tags={form.best_for}
          onChange={(tags) => setForm({ ...form, best_for: tags })}
        />
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>آیکون کارت</span>
            <select className="input" value={form.icon_key} onChange={(e) => setForm({ ...form, icon_key: e.target.value })}>
              <option value="">خودکار بر اساس نام خدمت</option>
              <option value="hand">دست / مانیکور</option>
              <option value="paintbrush">براش / ژل و لاک</option>
              <option value="footprints">پا / پدیکور</option>
              <option value="wrench">آچار / ترمیم</option>
            </select>
          </label>
          <div className="field" style={{ flex: 1 }}>
            <span>نمایش پرطرفدار</span>
            <div style={{ minHeight: 52, display: "flex", alignItems: "center" }}>
              <Switch checked={form.is_popular} onCheckedChange={(checked) => setForm({ ...form, is_popular: checked })} />
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>مدت (دقیقه)</span>
            <input
              className="input ltr num"
              type="number"
              min={5}
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Math.max(5, Number(e.target.value) || 5) })}
              style={{ textAlign: "center" }}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>قیمت (تومان)</span>
            <input
              className="input ltr num"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value) || 0) })}
              style={{ textAlign: "center" }}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>اولویت (۱-۱۰)</span>
            <input
              className="input ltr num"
              type="number"
              min={1}
              max={10}
              value={form.priority_score}
              onChange={(e) => setForm({ ...form, priority_score: Math.min(10, Math.max(1, Number(e.target.value))) })}
              style={{ textAlign: "center" }}
            />
          </label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn pri sm" style={{ flex: 1 }} onClick={onSave}>
            ذخیره
          </button>
          <button type="button" className="btn gl sm" style={{ flex: 1 }} onClick={onCancel}>
            انصراف
          </button>
        </div>
      </div>
    </div>
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
    <div style={{ display: "grid", gap: 8 }}>
      <span className="t-s">مناسب برای (تگ‌هایی که مشتری می‌بیند)</span>
      {tags.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="chip on"
            >
              {tag}
              <X size={13} strokeWidth={2} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <input
        className="input"
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
        aria-label="افزودن تگ"
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
    <div className="panel">
      {title && (
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 16 }}>{title}</p>
          <button type="button" className="iconbtn bare" onClick={onCancel} aria-label="بستن فرم">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}
      <input
        className="input"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="نام آپشن"
        aria-label="نام آپشن"
      />
      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <label className="field" style={{ flex: 1 }}>
          <span>مدت اضافه (دقیقه)</span>
          <input
            className="input ltr num"
            type="number"
            min={0}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Math.max(0, Number(e.target.value) || 0) })}
            style={{ textAlign: "center" }}
          />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>قیمت اضافه (تومان)</span>
          <input
            className="input ltr num"
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Math.max(0, Number(e.target.value) || 0) })}
            style={{ textAlign: "center" }}
          />
        </label>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <button type="button" className="btn pri sm" style={{ flex: 1 }} onClick={onSave}>
          ذخیره
        </button>
        <button type="button" className="btn gl sm" style={{ flex: 1 }} onClick={onCancel}>
          انصراف
        </button>
      </div>
    </div>
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
    <div style={{ position: "sticky", bottom: 88, zIndex: 10, display: "grid", gap: 8 }}>
      {saveError && (
        <p className="t-s center" role="alert" style={{ color: "var(--wine-hi)", background: "#8c2a3a22", borderRadius: 14, padding: "8px 12px" }}>{saveError}</p>
      )}
      <div className="row" style={{ gap: 10 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="btn pri"
          style={{ flex: 1 }}
        >
          {isSaving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </button>
        <button
          type="button"
          className="btn gl"
          style={{ flex: 1 }}
          onClick={onDiscard}
          disabled={isSaving}
        >
          انصراف
        </button>
      </div>
    </div>
  );
}

// ── Shared delete confirm ──

function DeleteConfirmDialog({ target, kind, onCancel, onConfirm }: {
  target: { id: string; name: string; future?: number } | null;
  kind: "service" | "addon";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const future = target?.future || 0;
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent className="max-w-[340px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {kind === "service"
              ? (future > 0 ? "این خدمت نوبت فعال دارد" : "حذف خدمت")
              : "حذف آپشن"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {kind === "service"
              ? (future > 0
                ? `${toPersianDigits(future)} نوبت آینده با این خدمت ثبت شده. به‌جای حذف، غیرفعالش می‌کنیم تا نوبت‌ها سالم بمانند.`
                : `«${target?.name || "این خدمت"}» حذف می‌شود. نوبت‌های قبلیِ این خدمت بدون نام و قیمت خواهند شد و از گزارش درآمد حذف می‌شوند.`)
              : `«${target?.name || "این آپشن"}» حذف می‌شود و از همهٔ خدمات برداشته خواهد شد.`}
            {" "}تغییر پس از ذخیره اعمال می‌شود.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>انصراف</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {kind === "service" && future > 0 ? "غیرفعال شود" : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
