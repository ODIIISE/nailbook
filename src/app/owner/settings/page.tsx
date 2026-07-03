"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSalon } from "@/lib/salon-context";
import { ScheduleManager } from "@/components/owner/schedule-manager";
import { toast } from "sonner";
import { Save, Camera, Phone, FileText, Sparkles, Clock } from "lucide-react";

export default function OwnerSettingsPage() {
  const { salon, updateSalon, workingHours, specificDaysOff, updateWorkingHours, updateSpecificDaysOff } = useSalon();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(salon.name);
  const [slogan, setSlogan] = useState(salon.slogan || "");
  const [description, setDescription] = useState(salon.description);
  const [phone, setPhone] = useState(salon.phone);
  const [address, setAddress] = useState(salon.address);
  const [avatarUrl, setAvatarUrl] = useState(salon.logo_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم فایل بیشتر از ۵ مگابایت است");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-highlight", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setAvatarUrl(data.url);
        await updateSalon({ logo_url: data.url });
        toast.success("لوگو ذخیره شد");
      } else {
        toast.error("خطا در آپلود تصویر");
      }
    } catch {
      toast.error("خطا در آپلود تصویر");
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSalon({ name, slogan, description, phone, address });
      toast.success("تغییرات ذخیره شد");
    } catch {
      toast.error("خطا در ذخیره تغییرات");
    }
    setSaving(false);
  };

  return (
    <div className="px-4 py-4 space-y-6">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={salon.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -left-1 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{salon.name}</p>
              <p className="text-sm text-muted-foreground">لوگوی سالن</p>
              {avatarUrl && (
                <button
                  onClick={() => setAvatarUrl("")}
                  className="text-xs text-destructive mt-1 hover:underline"
                >
                  حذف عکس
                </button>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">اطلاعات پایه</h3>
          </div>

          <div>
            <Label className="text-caption">نام سالن</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="نام سالن" />
          </div>

          <div>
            <Label className="text-caption">شعار تبلیغاتی</Label>
            <Input value={slogan} onChange={(e) => setSlogan(e.target.value)} className="mt-1" placeholder="مثلاً: زیبایی ناخن، اعتماد به نفس شما" />
          </div>

          <div>
            <Label className="text-caption">توضیحات</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="توضیح کوتاه درباره سالن" />
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">اطلاعات تماس</h3>
          </div>

          <div>
            <Label className="text-caption">شماره موبایل</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" dir="ltr" placeholder="09121234567" />
          </div>

          <div>
            <Label className="text-caption">آدرس</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" placeholder="آدرس سالن" />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">ساعات کاری</h3>
          </div>
          <ScheduleManager
            workingHours={workingHours}
            specificDaysOff={specificDaysOff}
            onSave={(hours, daysOff) => {
              updateWorkingHours(hours);
              updateSpecificDaysOff(daysOff);
              toast.success("ساعات کاری ذخیره شد");
            }}
          />
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full h-12">
          <Save className="h-5 w-5 ml-2" />
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
    </div>
  );
}
