"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Plus, X, Trash2, ImagePlus, ChevronDown, ChevronUp } from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import type { Highlight, HighlightImage } from "@/lib/mock-data";

export default function OwnerHighlightsPage() {
  const { highlights, addHighlight, updateHighlight, removeHighlight, addHighlightImage, removeHighlightImage, uploadHighlightImage } = useSalon();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editName, setEditName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const highlight: Highlight = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      cover_url: null,
      sort_order: highlights.length,
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
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const url = await uploadHighlightImage(files[i]);
      if (url) {
        const image: HighlightImage = {
          id: crypto.randomUUID(),
          highlight_id: highlight.id,
          image_url: url,
          caption: "",
          sort_order: highlight.images.length + i,
        };
        await addHighlightImage(image);
      }
    }
    setIsUploading(false);
    e.target.value = "";
  };

  const handleAddCover = async (e: React.ChangeEvent<HTMLInputElement>, highlight: Highlight) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadHighlightImage(file);
    if (url) {
      const updated = { ...highlight, cover_url: url };
      await updateHighlight(updated);
    }
    e.target.value = "";
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

  const expandedHighlight = highlights.find((h) => h.id === expandedId);

  return (
    <SalonGuard>
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">هایلایت‌ها</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {highlights.length} هایلایت
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
            return (
              <Card key={highlight.id} className="overflow-hidden">
                {/* Collapsed header — always visible */}
                <button
                  onClick={() => toggleExpand(highlight)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/40 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted shrink-0">
                    {highlight.cover_url ? (
                      <img src={highlight.cover_url} alt="" className="w-full h-full object-cover" />
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
                    <p className="text-[13px] text-muted-foreground">
                      {highlight.images.length} تصویر
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
                      <Label className="text-[13px]">نام</Label>
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

                    {/* Cover */}
                    <div>
                      <Label className="text-[13px]">کاور</Label>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-muted shrink-0">
                          {expandedHighlight.cover_url ? (
                            <img src={expandedHighlight.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImagePlus className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                          تغییر کاور
                        </Button>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleAddCover(e, expandedHighlight)}
                        />
                      </div>
                    </div>

                    {/* Images */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-[13px]">تصاویر ({expandedHighlight.images.length})</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          <ImagePlus className="h-4 w-4 ml-1" />
                          {isUploading ? "آپلود..." : "افزودن"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleAddImages(e, expandedHighlight)}
                        />
                      </div>

                      {expandedHighlight.images.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-[13px]">
                          هنوز تصویری اضافه نشده
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {expandedHighlight.images.map((image, index) => (
                            <div key={image.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
                              <img
                                src={image.image_url}
                                alt={`تصویر ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => handleRemoveImage(image.id)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded-full">
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
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-sm glass rounded-3xl p-6 animate-scale">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h2 text-foreground">هایلایت جدید</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-[13px]">نام هایلایت</Label>
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
                <Button onClick={handleCreate} className="flex-1" disabled={!newName.trim()}>
                  ایجاد
                </Button>
                <Button variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </SalonGuard>
  );
}
