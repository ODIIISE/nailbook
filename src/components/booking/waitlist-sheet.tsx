"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, Loader2, Check, MessageCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { haptic } from "@/lib/haptics";

interface WaitlistSheetProps {
  date: string; // YYYY-MM-DD
  onClose: () => void;
}

export function WaitlistSheet({ date, onClose }: WaitlistSheetProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"sms" | "whatsapp">("sms");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (loading) return;
    const normalized = normalizeDigits(phone);
    if (!isValidIranianPhone(normalized)) {
      toast.error("شماره موبایل معتبر نیست");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date_gregorian: date,
          customer_name: name.trim(),
          customer_phone: normalized,
          notification_method: method,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        haptic.success();
        setSuccess(true);
        toast.success("در لیست انتظار ثبت شدید");
        closeTimerRef.current = setTimeout(onClose, 1800);
      } else {
        toast.error(data.error || "خطا در ثبت‌نام");
      }
    } catch {
      toast.error("خطای سرور");
    } finally {
      setLoading(false);
    }
  }, [name, phone, method, date, loading, onClose]);

  // Cleanup auto-close timer on unmount
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  if (success) {
    return (
      <div className="p-6 text-center animate-scale">
        <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">ثبت شد!</h3>
        <p className="text-[13px] text-muted-foreground">
          اگر نوبت خالی شد، به شما اطلاع می‌دهیم.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-3">
          <Bell className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-[16px] font-bold text-foreground mb-1">لیست انتظار</h3>
        <p className="text-[13px] text-muted-foreground">
          اگر در این روز نوبت خالی شد، به شما اطلاع می‌دهیم.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-caption text-muted-foreground mb-1.5 block">نام (اختیاری)</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام شما"
            className="h-12 rounded-xl"
          />
        </div>

        <div>
          <Label className="text-caption text-muted-foreground mb-1.5 block">شماره موبایل</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            dir="ltr"
            className="h-12 rounded-xl text-left"
            autoFocus
          />
        </div>

        <div>
          <Label className="text-caption text-muted-foreground mb-2 block">روش اطلاع‌رسانی</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMethod("sms")}
              className={`flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-medium transition-all ${
                method === "sms"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Smartphone className="h-4 w-4" />
              پیامک
            </button>
            <button
              onClick={() => setMethod("whatsapp")}
              className={`flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-medium transition-all ${
                method === "whatsapp"
                  ? "bg-[#25D366] text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              واتساپ
            </button>
          </div>
        </div>
      </div>

      <Button
        size="xl"
        className="w-full"
        onClick={handleSubmit}
        disabled={loading || !isValidIranianPhone(normalizeDigits(phone))}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال ثبت...
          </span>
        ) : (
          "ثبت در لیست انتظار"
        )}
      </Button>
    </div>
  );
}
