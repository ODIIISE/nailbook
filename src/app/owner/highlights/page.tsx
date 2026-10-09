"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SalonGuard } from "@/components/ui/salon-guard";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Plus, X, Trash2, ImagePlus, ChevronDown, ChevronUp, Check, Link2, Package } from "lucide-react";
import Image from "next/image";
import { useSalon } from "@/lib/salon-context";
import { formatPrice, toPersianDigits } from "@/lib/jalali";
import type { Highlight, HighlightImage } from "@/lib/types";
import { toast } from "sonner";

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
      let failedUploads = 0;
      for (let i = 0; i < files.length; i++) {
        const url = await uploadHighlightImage(files[i]);
        if (!url) { failedUploads++; continue; }
        const image: HighlightImage = {
          id: crypto.randomUUID(),
          highlight_id: highlight.id,
          image_url: url,
          caption: "",
          sort_order: nextSortOrder++,
        };
        await addHighlightImage(image);
      }
      if (failedUploads > 0) {
        toast.error(`${failedUploads} تصویر آپلود نشد`, { description: "لطفاً دوباره تلاش کنید" });
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
    <div className="page-gutter space-y-4 pb-8 pt-2">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 className="h-m">نمونه‌کارها</h2>
          <p className="t-s num" style={{ marginTop: 2 }}>
            {toPersianDigits(highlights.length)} مدل · لینک خدمت و آپشن برای هر مدل
          </p>
        </div>
        <button type="button" className="btn pri sm" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} strokeWidth={1.6} />
          جدید
        </button>
      </div>

      {highlights.length === 0 ? (
        <div className="panel center">
          <p className="mute">هنوز مدلی اضافه نشده</p>
          <button type="button" className="btn pri sm" style={{ marginTop: 14 }} onClick={() => setShowCreateModal(true)}>
            <Plus size={16} strokeWidth={1.6} />
            ایجاد مدل
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {highlights.map((highlight) => {
            const isExpanded = expandedId === highlight.id;
            const linkedService = highlight.service_id ? serviceById.get(highlight.service_id) : undefined;
            return (
              <div key={highlight.id} className="panel" style={{ padding: 0, overflow: "hidden" }}>
                {/* Collapsed header — always visible */}
                <button
                  onClick={() => toggleExpand(highlight)}
                  aria-expanded={isExpanded}
                  className="row"
                  style={{ width: "100%", padding: 16, textAlign: "start" }}
                >
                  <span style={{ position: "relative", width: 52, height: 52, borderRadius: 16, overflow: "hidden", background: "var(--bg3)", flex: "none" }}>
                    {highlight.cover_url ? (
                      <Image src={highlight.cover_url} alt={highlight.name} fill unoptimized style={{ objectFit: "cover" }}
                        onError={(event) => { event.currentTarget.style.display = "none"; }} />
                    ) : (
                      <span className="center" style={{ display: "grid", placeItems: "center", height: "100%", fontSize: 20, color: "var(--faint)" }}>
                        {highlight.name.charAt(0)}
                      </span>
                    )}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{highlight.name}</span>
                    <span className="t-s num" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {toPersianDigits(highlight.images.length)} تصویر
                      {linkedService ? (
                        <span className="pearl"> · {linkedService.name}</span>
                      ) : (
                        <span> · بدون خدمت</span>
                      )}
                    </span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`حذف ${highlight.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(highlight.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        void handleDelete(highlight.id);
                      }
                    }}
                    className="iconbtn bare"
                    style={{ flex: "none" }}
                  >
                    <Trash2 size={17} strokeWidth={1.5} style={{ color: "var(--wine-hi)" }} />
                  </span>
                  {isExpanded ? (
                    <ChevronUp size={18} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--faint)", flex: "none" }} />
                  ) : (
                    <ChevronDown size={18} strokeWidth={1.5} aria-hidden="true" style={{ color: "var(--faint)", flex: "none" }} />
                  )}
                </button>

                {/* Expanded edit panel — inline */}
                {isExpanded && expandedHighlight && (
                  <div style={{ padding: "4px 16px 16px", display: "grid", gap: 16 }}>
                    {/* Name */}
                    <div>
                      <span className="t-s">نام</span>
                      <div className="row" style={{ gap: 8, marginTop: 8 }}>
                        <input
                          className="input"
                          style={{ flex: 1 }}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          aria-label="نام مدل"
                        />
                        <button
                          type="button"
                          className="btn gl sm"
                          onClick={() => handleSaveName(expandedHighlight)}
                          disabled={editName.trim() === expandedHighlight.name}
                        >
                          ذخیره
                        </button>
                      </div>
                    </div>

                    {/* Linked service */}
                    <div className="field">
                      <span className="row" style={{ gap: 6 }}>
                        <Link2 size={14} strokeWidth={1.5} aria-hidden="true" />
                        خدمت مرتبط (قیمت و مدت از آن محاسبه می‌شود)
                      </span>
                      <select
                        className="input"
                        value={expandedHighlight.service_id ?? ""}
                        onChange={(e) => handleLinkService(expandedHighlight, e.target.value)}
                      >
                        <option value="">بدون خدمت — فقط نمایش مدل</option>
                        {activeServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {toPersianDigits(s.duration_minutes)} دقیقه · {formatPrice(Number(s.price))}
                          </option>
                        ))}
                      </select>
                      {activeServices.length === 0 && (
                        <p className="t-s" style={{ marginTop: 6 }}>
                          ابتدا در «خدمات» یک خدمت فعال بسازید.
                        </p>
                      )}
                    </div>

                    {/* Linked addons — restricted to what the service actually offers */}
                    <div>
                      <div className="row" style={{ justifyContent: "space-between" }}>
                        <span className="t-s row" style={{ gap: 6 }}>
                          <Package size={14} strokeWidth={1.5} aria-hidden="true" />
                          آپشن‌های این مدل
                        </span>
                        {expandedHighlight.addon_ids.length > 0 && (
                          <button
                            type="button"
                            className="t-s"
                            style={{ color: "var(--wine-hi)" }}
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
                            <p className="t-s" style={{ marginTop: 8 }}>
                              ابتدا یک خدمت مرتبط انتخاب کنید؛ سپس آپشن‌های آن خدمت را برای این مدل برمی‌گزینید.
                            </p>
                          );
                        }
                        if (offered.length === 0) {
                          return (
                            <p className="t-s" style={{ marginTop: 8 }}>
                              این خدمت آپشنی ندارد — در «خدمات» آپشن به خدمت اضافه کنید.
                            </p>
                          );
                        }
                        return (
                          <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                            {offered.map((addon) => {
                              const on = expandedHighlight.addon_ids.includes(addon.id);
                              return (
                                <button
                                  key={addon.id}
                                  type="button"
                                  onClick={() => handleToggleLookAddon(expandedHighlight, addon.id)}
                                  className={`chip num${on ? " on" : ""}`}
                                  aria-pressed={on}
                                >
                                  {on && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                                  {addon.name}
                                  <span className="mute">
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
                      <div className="panel">
                        <p className="t-s">نمایش به مشتری هنگام رزرو این مدل</p>
                        <p style={{ fontSize: 15, marginTop: 4 }}>
                          {preview.service?.name ?? "بدون خدمت"}
                          {preview.addons.length > 0 && (
                            <span className="mute">
                              {" "}· {preview.addons.map((a) => a.name).join("، ")}
                            </span>
                          )}
                        </p>
                        <p className="t-s num" style={{ marginTop: 2 }}>
                          {toPersianDigits(preview.duration)} دقیقه ·{" "}
                          <span className="pearl">{formatPrice(preview.price)}</span>
                        </p>
                      </div>
                    )}

                    {/* Cover */}
                    <div>
                      <span className="t-s">کاور</span>
                      <div className="row" style={{ gap: 12, marginTop: 8 }}>
                        <span style={{ position: "relative", width: 56, height: 56, borderRadius: "50%", overflow: "hidden", background: "var(--bg3)", flex: "none" }}>
                          {coverPreview ? (
                            <Image src={coverPreview} alt={expandedHighlight.name} fill unoptimized style={{ objectFit: "cover" }}
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }} />
                          ) : (
                            <span style={{ display: "grid", placeItems: "center", height: "100%" }}>
                              <ImagePlus size={20} strokeWidth={1.4} aria-hidden="true" style={{ color: "var(--faint)" }} />
                            </span>
                          )}
                        </span>
                        <button type="button" className="btn gl sm" onClick={() => {
                            if (isUploading) return;
                            coverInputHighlightIdRef.current = expandedHighlight.id;
                            coverInputRef.current?.click();
                          }}
                          disabled={isUploading}>
                          تغییر کاور
                        </button>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          aria-hidden="true"
                          tabIndex={-1}
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
                      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                        <span className="t-s num">تصاویر ({toPersianDigits(expandedHighlight.images.length)})</span>
                        <button
                          type="button"
                          className="btn gl sm"
                          onClick={() => {
                            imageInputHighlightIdRef.current = expandedHighlight.id;
                            fileInputRef.current?.click();
                          }}
                          disabled={isUploading}
                        >
                          <ImagePlus size={16} strokeWidth={1.5} />
                          {isUploading && uploadingHighlightId === expandedHighlight.id ? "آپلود..." : "افزودن"}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: "none" }}
                          aria-hidden="true"
                          tabIndex={-1}
                          onChange={(e) => {
                            const target = highlightsRef.current.find((h) => h.id === imageInputHighlightIdRef.current);
                            if (target) void handleAddImages(e, target);
                            else e.currentTarget.value = "";
                          }}
                        />
                      </div>

                      {expandedHighlight.images.length === 0 ? (
                        <p className="empty">
                          هنوز تصویری اضافه نشده
                        </p>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                          {expandedHighlight.images.map((image, index) => (
                            <div key={image.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: "var(--bg3)" }}>
                              <Image
                                src={image.image_url}
                                alt={`تصویر ${index + 1}`}
                                fill
                                unoptimized
                                style={{ objectFit: "cover" }}
                              />
                              <button
                                onClick={() => handleRemoveImage(image.id)}
                                aria-label={`حذف تصویر ${index + 1}`}
                                className="iconbtn bare"
                                style={{ position: "absolute", top: 4, insetInlineEnd: 4, background: "#00000088" }}
                              >
                                <X size={14} strokeWidth={2} />
                              </button>
                              <span className="num" style={{ position: "absolute", bottom: 4, insetInlineStart: 4, fontSize: 11, background: "#00000088", borderRadius: 999, padding: "1px 8px" }}>
                                {toPersianDigits(index + 1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create sheet */}
      <BottomSheet open={showCreateModal} onClose={() => setShowCreateModal(false)} title="مدل جدید">
        <label className="field">
          <span>نام مدل</span>
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="مثلاً: فرنچ کلاسیک"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
        </label>

        <div className="row" style={{ gap: 10, marginTop: 18 }}>
          <button type="button" className="btn pri" style={{ flex: 1 }} onClick={handleCreate} disabled={!newName.trim()}>
            ایجاد
          </button>
          <button type="button" className="btn gl" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>
            انصراف
          </button>
        </div>
      </BottomSheet>
    </div>
    </SalonGuard>
  );
}
