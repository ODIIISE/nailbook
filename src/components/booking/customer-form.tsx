"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CustomerFormProps {
  onSubmit: (name: string, phone: string) => void;
  isLoading?: boolean;
}

export function CustomerForm({ onSubmit, isLoading }: CustomerFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  const validateIranianPhone = (p: string) => {
    const cleaned = p.replace(/\D/g, "");
    return /^09\d{9}$/.test(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; phone?: string } = {};

    if (!name.trim()) {
      newErrors.name = "نام الزامی است";
    }

    const cleanedPhone = phone.replace(/\D/g, "");
    if (!cleanedPhone) {
      newErrors.phone = "شماره موبایل الزامی است";
    } else if (!validateIranianPhone(cleanedPhone)) {
      newErrors.phone = "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(name.trim(), cleanedPhone);
  };

  return (
    <Card className="mx-auto max-w-lg p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            نام و نام خانوادگی
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام خود را وارد کنید"
            className="mt-1"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name}</p>
          )}
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            شماره موبایل
          </Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            dir="ltr"
            className="mt-1 text-left"
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-rose hover:bg-rose/90 text-white"
          disabled={isLoading}
        >
          {isLoading ? "در حال ارسال..." : "ارسال کد تایید"}
        </Button>
      </form>
    </Card>
  );
}
