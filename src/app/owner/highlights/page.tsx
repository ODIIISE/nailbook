"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Plus, X, Trash2, ImagePlus, ChevronDown, ChevronUp, Check, Link2, Package } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSalon } from "@/lib/salon-context";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Highlight, HighlightImage } from "@/lib/types";

export default function OwnerHighlightsPage() {
  const { highlights, addons, services, addHighlight, updateHighlight, removeHighlight, addHighlightImage, removeHighlightImage, uploadHighlightImage } = useSalon();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingHighlightId, setUploadingHighlightId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const highlightsRef = useRef(highlights);
  const imageInputHighlightIdRef = useRef<string | null>(null);
  const coverInputHighlightIdRef = useRef<string | null>(null);
  const uploadingRef = useRef(false);

  // Only active services are bookable on the customer side — never offer a
  // deactivated one as the look's linked service.
  const activeServices = useMemo(
    () => services.filter((s) => s.is_active).sort((a, b) => a.sort_order - b.sort_order),
    [services],
  );
  const serviceById = useMemo(() => new Map(activeServices.map((s) => [s.id, s])), [activeServices]);
  // Addons that actually belong to the selected service are the only ones the
  // booking flow will surface — restrict the picker to those so the owner can
  // never attach an addon that would silently never show for customers.
  const activeAddons = useMemo(() => addons.filter((a) => a.is_active).sort((a, b) => a.sort_order - b.sort_order), [addons]);

  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      cover_url: null,
      sort_order: highlights.length,
      addon_ids: [],
      images: [],
    };
    await addHighlight(highlight);
    setNewName("");
    setShowCreateModal(false);
  };

  const handleDelete = async (id: string) => {
    await removeHighlight(id);
    if (expandedId === id) setExpandedId(null);
  };

  const toggleExpand = (highlight: Highlight) => {
    if (expandedId === highlight.id) {
      setExpandedId(null);
    } else {
      setExpandedId(highlight.id);
      setEditName(highlight.name);
    }
  };

  const handleAddImages = async (e: React.ChangeEvent<HTMLInputElement>, highlight: Highlight) => {
    const files = e.target.files;
    if (!files || files.length === 0 || uploadingRef.current) {
      e.target.value = "";
      return;
    }

    uploadingRef.current = true;
    setIsUploading(true);
    setUploadingHighlightId(highlight.id);
    try {
      const latest = highlightsRef.current.find((item) => item.id === highlight.id) ?? highlight;
      let nextSortOrder = latest.images.reduce((max, image) => Math.max(max, image.sort_order), -1) + 1;
      for (let i = 0; i < files.length; i++) {
        const url = await uploadHighlightImage(files[i]);
        if (!url) continue;
        const image: HighlightImage = {
          id: crypto.randomUUID(),
          highlight_id: highlight.id,
          image_url: url,
          caption: "",
          sort_order: nextSortOrder++,
        };
        await addHighlightImage(image);
      }
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
      setUploadingHighlightId(null);
      e.target.value = "";
    }
  };

  const handleAddCover = async (e: React.ChangeEvent<HTMLInputElement>, highlight: Highlight) => {
    const file = e.target.files?.[0];
    if (!file || isUploading || uploadingRef.current) {
      e.target.value = "";
      return;
    }

    uploadingRef.current = true;
    setIsUploading(true);
    setUploadingHighlightId(highlight.id);
    try {
      const url = await uploadHighlightImage(file);
      if (url) {
        const latest = highlightsRef.current.find((item) => item.id === highlight.id) ?? highlight;
        await updateHighlight({ ...latest, cover_url: url });
      }
    } finally {
      uploadingRef.current = false;
      setIsUploading(false);
      setUploadingHighlightId(null);
      e.target.value = "";
    }
  };

  const handleRemoveImage = async (imageId: string) => {
    await removeHighlightImage(imageId);
  };

  const handleSaveName = async (highlight: Highlight) => {
    if (editName.trim() && editName.trim() !== highlight.name) {
      const updated = { ...highlight, name: editName.trim() };
      await updateHighlight(updated);
    }
  };

  // Link a service to the look. Changing the service drops any addons that the
  // new service doesn't offer — keeping the stored selection always valid.
  const handleLinkService = async (highlight: Highlight, serviceId: string) => {
    const nextService = serviceById.get(serviceId);
    const validAddons = nextService
      ? highlight.addon_ids.filter((id) => nextService.addon_ids.includes(id))
      : [];
    const updated = { ...highlight, service_id: serviceId || null, addon_ids: validAddons };
    await updateHighlight(updated);
  };

  const handleToggleLookAddon = async (highlight: Highlight, addonId: string) => {
    const has = highlight.addon_ids.includes(addonId);
    const updated = { ...highlight, addon_ids: has ? highlight.addon_ids.filter((id) => id !== addonId) : [...highlight.addon_ids, addonId] };
    await updateHighlight(updated);
  };

  const expandedHighlight = highlights.find((h) => h.id === expandedId);
  const coverPreview = expandedHighlight?.cover_url || null;

  // Computed totals for the expanded look — the same math the customer sheet
  // and booking flow use (service + its offered addons), so the owner sees
  // exactly what buyers see. Stale addon ids (deleted, or unlinked from the
  // service) are dropped here too.
  const preview = useMemo(() => {
    if (!expandedHighlight) return null;
    const svc = expandedHighlight.service_id ? serviceById.get(expandedHighlight.service_id) : undefined;
    const offered = svc ? new Set(svc.addon_ids) : null;
    const lookAddons = offered
      ? expandedHighlight.addon_ids
          .filter((id) => offered.has(id))
          .map((id) => activeAddons.find((a) => a.id === id))
          .filter((a): a is NonNullable<typeof a> => Boolean(a))
      : [];
    return {
      service: svc,
      addons: lookAddons,
      price: (svc ? Number(svc.price) : 0) + lookAddons.reduce((sum, a) => sum + Number(a.price), 0),
      duration: (svc ? Number(svc.duration_minutes) : 0) + lookAddons.reduce((sum, a) => sum + Number(a.duration_minutes), 0),
    };
  }, [expandedHighlight, serviceById, activeAddons]);

  return (
    <SalonGuard>
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">هایلایت‌ها</h2>
          <p className="text-caption text-muted-foreground mt-0.5">
            {highlights.length} هایلایت · لینک خدمت و آپشن برای هر مدل
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 ml-1" />
          جدید
        </Button>
      </div>

      {highlights.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">هنوز هایلایتی اضافه نشده</p>
          <Button size="sm" className="mt-3" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 ml-1" />
            ایجاد هایلایت
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {highlights.map((highlight) => {
            const isExpanded = expandedId === highlight.id;
            const linkedService = highlight.service_id ? serviceById.get(highlight.service_id) : undefined;
            return (
              <Card key={highlight.id} className="overflow-hidden">
                {/* Collapsed header — always visible */}
                <button
                  onClick={() => toggleExpand(highlight)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted transition-colors"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                    {highlight.cover_url ? (
                      <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized className="object-cover"
                        onError={(event) => { event.currentTarget.style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-lg font-bold text-muted-foreground">
                          {highlight.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{highlight.name}</p>
                    <p className="text-caption text-muted-foreground truncate">
                      {highlight.images.length} تصویر
                      {linkedService && (
                        <span className="text-primary/80"> · {linkedService.name}</span>
                      )}
                      {!linkedService && (
                        <span className="text-muted-foreground/60"> · بدون خدمت</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(highlight.id);
                    }}
                    className="text-destructive hover:text-destructive shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>

                {/* Expanded edit panel — inline */}
                {isExpanded && expandedHighlight && (
                  <div className="px-4 pb-4 space-y-4 border-t border-border/30">
                    {/* Name */}
                    <div className="pt-3">
                      <Label className="text-caption">نام</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleSaveName(expandedHighlight)}
                          disabled={editName.trim() === expandedHighlight.name}
                        >
                          ذخیره
                        </Button>
                      </div>
                    </div>

                    {/* Linked service */}
                    <div>
                      <Label className="text-caption flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" />
                        خدمت مرتبط (قیمت و مدت از آن محاسبه می‌شود)
                      </Label>
                      <select
                        value={expandedHighlight.service_id ?? ""}
                        onChange={(e) => handleLinkService(expandedHighlight, e.target.value)}
                        className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      >
                        <option value="">بدون خدمت — فقط نمایش مدل</option>
                        {activeServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {toPersianDigits(s.duration_minutes)} دقیقه · {formatPrice(Number(s.price))} تومان
                          </option>
                        ))}
                      </select>
                      {activeServices.length === 0 && (
                        <p className="text-small text-muted-foreground mt-1">
                          ابتدا در «خدمات و آپشن‌ها» یک خدمت فعال بسازید.
                        </p>
                      )}
                    </div>

                    {/* Linked addons — restricted to what the service actually offers */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-caption flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          آپشن‌های این مدل (در مجموع قیمت و مدت محاسبه می‌شود)
                        </Label>
                        {expandedHighlight.addon_ids.length > 0 && (
                          <button
                            type="button"
                            className="text-small text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => {
                              const updated = { ...expandedHighlight, addon_ids: [] };
                              void updateHighlight(updated);
                            }}
                          >
                            پاک کردن همه
                          </button>
                        )}
                      </div>

                      {(() => {
                        const svc = expandedHighlight.service_id ? serviceById.get(expandedHighlight.service_id) : undefined;
                        const offered = svc
                          ? activeAddons.filter((a) => svc.addon_ids.includes(a.id))
                          : [];
                        if (!svc) {
                          return (
                            <p className="text-small text-muted-foreground mt-1.5">
                              ابتدا یک خدمت مرتبط انتخاب کنید؛ سپس آپشن‌های آن خدمت را برای این مدل برمی‌گزینید.
                            </p>
                          );
                        }
                        if (offered.length === 0) {
                          return (
                            <p className="text-small text-muted-foreground mt-1.5">
                              این خدمت آپشنی ندارد — در «خدمات و آپشن‌ها» آپشن به خدمت اضافه کنید.
                            </p>
                          );
                        }
                        return (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {offered.map((addon) => {
                              const on = expandedHighlight.addon_ids.includes(addon.id);
                              return (
                                <button
                                  key={addon.id}
                                  type="button"
                                  onClick={() => handleToggleLookAddon(expandedHighlight, addon.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    on
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                  }`}
                                  aria-pressed={on}
                                >
                                  {on && <Check className="h-3 w-3" />}
                                  {addon.name}
                                  <span className={on ? "opacity-80" : "text-muted-foreground/60"}>
                                    +{toPersianDigits(addon.duration_minutes)}د · +{formatPrice(Number(addon.price))}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* What the customer will see — price & duration */}
                    {preview && (preview.service || preview.addons.length > 0) && (
                      <div className="rounded-xl bg-muted/60 border border-border/40 px-4 py-3 space-y-1">
                        <p className="text-small text-muted-foreground">نمایش به مشتری هنگام رزرو این مدل</p>
                        <p className="text-sm font-semibold text-foreground">
                          {preview.service?.name ?? "بدون خدمت"}
                          {preview.addons.length > 0 && (
                            <span className="font-normal text-muted-foreground">
                              {" "}· {preview.addons.map((a) => a.name).join("، ")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {toPersianDigits(preview.duration)} دقیقه ·{" "}
                          <span className="font-bold text-foreground">{formatPrice(preview.price)} تومان</span>
                        </p>
                      </div>
                    )}

                    {/* Cover */}
                    <div>
                      <Label className="text-caption">کاور</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0">
                          {coverPreview ? (
                            <Image src={coverPreview} alt={expandedHighlight.name} fill unoptimized className="object-cover"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImagePlus className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm"                          onClick={() => {
                            if (isUploading) return;
                            coverInputHighlightIdRef.current = expandedHighlight.id;
                            coverInputRef.current?.click();
                          }}
                          disabled={isUploading}>
                          تغییر کاور
                        </Button>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const target = highlightsRef.current.find((h) => h.id === coverInputHighlightIdRef.current);
                            if (target) void handleAddCover(e, target);
                            else e.currentTarget.value = "";
                          }}
                        />
                      </div>
                    </div>

                    {/* Images */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-caption">تصاویر ({expandedHighlight.images.length})</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            imageInputHighlightIdRef.current = expandedHighlight.id;
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                        >
                          <ImagePlus className="h-4 w-4 ml-1" />
                          {isUploading && uploadingHighlightId === expandedHighlight.id ? "آپلود..." : "افزودن"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const target = highlightsRef.current.find((h) => h.id === imageInputHighlightIdRef.current);
                            if (target) void handleAddImages(e, target);
                            else e.currentTarget.value = "";
                          }}
                        />
                      </div>

                      {expandedHighlight.images.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-caption">
                          هنوز تصویری اضافه نشده
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {expandedHighlight.images.map((image, index) => (
                            <div key={image.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
                              <Image
                                src={image.image_url}
                                alt={`تصویر ${index + 1}`}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                              <button
                                onClick={() => handleRemoveImage(image.id)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <span className="absolute bottom-1 left-1 text-small text-white bg-black/50 px-1.5 py-0.5 rounded-full">
                                {index + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>هایلایت جدید</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-caption">نام هایلایت</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثلاً: نمونه کار"
                className="mt-1"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button size="lg" onClick={handleCreate} className="flex-1" disabled={!newName.trim()}>
                ایجاد
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                انصراف
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </SalonGuard>
  );
}
