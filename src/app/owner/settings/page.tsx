"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSalon } from "@/lib/salon-context";
import { toPersianDigits } from "@/lib/jalali";
import { toast } from "sonner";
import { Save, Camera, Clock, MapPin, Phone, FileText, Sparkles } from "lucide-react";

const IRAN_WEEK_DAYS = [
  { key: "sat", label: "شنبه" },
  { key: "sun", label: "یکشنبه" },
  { key: "mon", label: "دوشنبه" },
  { key: "tue", label: "سه‌شنبه" },
  { key: "wed", label: "چهارشنبه" },
  { key: "thu", label: "پنجشنبه" },
  { key: "fri", label: "جمعه" },
];

export default function OwnerSettingsPage() {
  const router = useRouter();
  const { salon, updateSalon } = useSalon();

  const [name, setName] = useState(salon.name);
  const [slogan, setSlogan] = useState(salon.slogan || "");
  const [description, setDescription] = useState(salon.description);
  const [phone, setPhone] = useState(salon.phone);
  const [address, setAddress] = useState(salon.address);
  const [workingHours, setWorkingHours] = useState(salon.working_hours);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSalon({
        name,
        slogan,
        description,
        phone,
        address,
        working_hours: workingHours,
      });
      toast.success("تغییرات ذخیره شد");
    } catch {
      toast.error("خطا در ذخیره تغییرات");
    }
    setSaving(false);
  };

  const toggleDay = (key: string) => {
    const current = workingHours[key];
    const newHours = { ...workingHours };
    if (current === null) {
      newHours[key] = { open: "10:00", close: "18:00" };
    } else {
      newHours[key] = null;
    }
    setWorkingHours(newHours);
  };

  const updateTime = (key: string, field: "open" | "close", value: string) => {
    const current = workingHours[key];
    if (!current) return;
    setWorkingHours({
      ...workingHours,
      [key]: { ...current, [field]: value },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header showBack title="تنظیمات" subtitle="مدیریت اطلاعات سالن" />

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Avatar / Logo */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
                💅
              </div>
              <button className="absolute -bottom-1 -left-1 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <p className="font-semibold text-foreground">{salon.name}</p>
              <p className="text-sm text-muted-foreground">لوگوی سالن</p>
            </div>
          </div>
        </Card>

        {/* Basic Info */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">اطلاعات پایه</h3>
          </div>

          <div>
            <Label className="text-caption">نام سالن</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              placeholder="نام سالن"
            />
          </div>

          <div>
            <Label className="text-caption">شعار تبلیغاتی</Label>
            <Input
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              className="mt-1"
              placeholder="مثلاً: زیبایی ناخن، اعتماد به نفس شما"
            />
          </div>

          <div>
            <Label className="text-caption">توضیحات</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              placeholder="توضیح کوتاه درباره سالن"
            />
          </div>
        </Card>

        {/* Contact Info */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">اطلاعات تماس</h3>
          </div>

          <div>
            <Label className="text-caption">شماره موبایل</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              dir="ltr"
              placeholder="09121234567"
            />
          </div>

          <div>
            <Label className="text-caption">آدرس</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1"
              placeholder="آدرس سالن"
            />
          </div>
        </Card>

        {/* Working Hours */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">ساعات کاری</h3>
          </div>

          {IRAN_WEEK_DAYS.map((day) => {
            const dayHours = workingHours[day.key];
            const isActive = dayHours !== null;

            return (
              <div key={day.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleDay(day.key)}
                  />
                  <span className="font-medium text-foreground w-20">{day.label}</span>
                </div>

                {isActive && dayHours && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => updateTime(day.key, "open", e.target.value)}
                      className="w-24 h-9 text-center"
                    />
                    <span className="text-muted-foreground">تا</span>
                    <Input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => updateTime(day.key, "close", e.target.value)}
                      className="w-24 h-9 text-center"
                    />
                  </div>
                )}

                {!isActive && (
                  <span className="text-sm text-muted-foreground">تعطیل</span>
                )}
              </div>
            );
          })}
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12"
        >
          <Save className="h-5 w-5 ml-2" />
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
      </div>
    </div>
  );
}
