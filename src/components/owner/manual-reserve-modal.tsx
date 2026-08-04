"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { normalizeDigits } from "@/lib/digits";
import { toPersianDigits } from "@/lib/jalali";
import { getIranWeekDay } from "@/lib/slots";
import type { Service } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";

interface ManualReserveModalProps {
  date: Date;
  services: Service[];
  workingHours: WorkingHours;
  slotIntervalMinutes?: number;
  slotBufferMinutes?: number;
  onReserve: (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    start_time: string;
    end_time: string;
  }) => void | Promise<void>;
  onClose: () => void;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) return "";
  const duration = Number(durationMinutes);
  const safeDuration = Number.isFinite(duration) ? Math.max(0, Math.floor(duration)) : 0;
  const endMinutes = hours * 60 + minutes + safeDuration;
  if (endMinutes >= 24 * 60) return "";
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}

export function formatManualServiceLabel(service?: Pick<Service, "name" | "duration_minutes"> | null): string {
  return service
    ? `${service.name} · ${toPersianDigits(service.duration_minutes)} دقیقه`
    : "خدمت را انتخاب کنید";
}

export function ManualReserveModal({
  date,
  services,
  workingHours,
  slotIntervalMinutes = 15,
  slotBufferMinutes = 0,
  onReserve,
  onClose,
}: ManualReserveModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState(() => services.find((service) => service.is_active)?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const activeServices = useMemo(() => services.filter((service) => service.is_active), [services]);
  // Services load asynchronously in the shared salon provider. Resolve a
  // temporary empty/stale selection during render so the label never falls
  // back to the raw UUID and no state-setting effect is needed.
  const resolvedServiceId = activeServices.some((service) => service.id === serviceId)
    ? serviceId
    : activeServices[0]?.id || "";
  const selectedService = activeServices.find((s) => s.id === resolvedServiceId);

  // Derive default start time from working hours
  const defaultStartTime = useMemo(() => {
    const dayKey = getIranWeekDay(date);
    const dayHours = workingHours[dayKey];
    return dayHours?.open || "09:00";
  }, [date, workingHours]);

  const [startTime, setStartTime] = useState(defaultStartTime);

  // Round the end time up to the salon's slot grid, honoring the configured
  // slot buffer so manual reservations respect the salon's scheduling rules.
  const getEffectiveDuration = useCallback((duration: number) =>
    Math.ceil((duration + slotBufferMinutes) / Math.max(1, slotIntervalMinutes)) * Math.max(1, slotIntervalMinutes),
    [slotBufferMinutes, slotIntervalMinutes]
  );

  // Auto-calculate end time from start time + service duration (grid-aware)
  const [endTime, setEndTime] = useState(() =>
    selectedService ? calculateEndTime(startTime, getEffectiveDuration(selectedService.duration_minutes)) : ""
  );

  const lastResolvedServiceIdRef = useRef(resolvedServiceId);

  // If services arrived after the modal mounted, hydrate the end time once.
  // If a previously selected service was deactivated, update the derived end
  // time to match the fallback service instead of submitting stale duration.
  // Do not overwrite an owner's manually edited end time for ordinary edits.
  useEffect(() => {
    if (!selectedService || !resolvedServiceId) return;
    const serviceChanged = lastResolvedServiceIdRef.current !== resolvedServiceId;
    if (!endTime || serviceChanged) {
      setEndTime(calculateEndTime(startTime, getEffectiveDuration(selectedService.duration_minutes)));
    }
    lastResolvedServiceIdRef.current = resolvedServiceId;
  }, [endTime, selectedService, resolvedServiceId, startTime, getEffectiveDuration]);

  // Update end time when service or start time changes
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id && s.is_active);
    if (svc) {
      setEndTime(calculateEndTime(startTime, getEffectiveDuration(svc.duration_minutes)));
    }
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    if (selectedService) {
      setEndTime(calculateEndTime(time, getEffectiveDuration(selectedService.duration_minutes)));
    }
  };

  const isValid = Boolean(
    phone && selectedService &&
    /^(09|۰۹)[۰-۹0-9]{9}$/.test(normalizeDigits(phone)) &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime) &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(endTime) &&
    endTime > startTime
  );

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      await onReserve({
        customer_name: name.trim(),
        customer_phone: normalizeDigits(phone),
        service_id: resolvedServiceId,
        start_time: startTime,
        end_time: endTime,
      });
    } catch {
      setSubmitError("ثبت رزرو انجام نشد؛ دوباره تلاش کنید");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet open={true} onClose={onClose} title="رزرو دستی">
      <div className="space-y-4">
        <div>
          <Label className="text-caption">نام مشتری</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام (اختیاری)"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-caption">شماره موبایل</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            dir="ltr"
            className="mt-1 text-left"
          />
          <p className="text-small text-muted-foreground mt-1">
            اگر شماره جدید باشد، کاربر خودکار ساخته می‌شود
          </p>
        </div>

        <div>
          <Label className="text-caption">خدمت</Label>
          {activeServices.length > 0 ? (
            <Select value={resolvedServiceId} onValueChange={(val) => handleServiceChange(val as string)}>
              <SelectTrigger className="mt-1 w-full h-12 rounded-xl border border-border bg-card px-3 text-body" dir="rtl">
                {/* Base UI renders the raw value when SelectValue has no child.
                    Provide the selected label explicitly so UUIDs never leak into the form. */}
                <SelectValue placeholder="خدمت را انتخاب کنید">
                  {(value) => {
                    const service = activeServices.find((item) => item.id === value);
                    return formatManualServiceLabel(service);
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} - {toPersianDigits(s.duration_minutes)} دقیقه
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1 rounded-xl border border-border bg-muted/40 px-3 py-3 text-caption text-muted-foreground">
              هنوز خدمتی برای رزرو فعال نشده است
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-caption">از ساعت</Label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="mt-1 text-center"
              dir="ltr"
            />
          </div>
          <div>
            <Label className="text-caption">تا ساعت</Label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 text-center"
              dir="ltr"
            />
          </div>
        </div>

        {endTime && startTime && endTime <= startTime && (
          <p className="text-small text-destructive text-center">ساعت پایان باید بعد از ساعت شروع باشد</p>
        )}
        {submitError && <p role="alert" className="text-caption text-destructive text-center">{submitError}</p>}
      </div>

      <div className="flex gap-3 mt-5">
        <Button onClick={handleSubmit} className="flex-1" disabled={!isValid || isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "در حال ثبت..." : "ثبت رزرو"}
        </Button>
        <Button variant="outline" onClick={onClose} className="flex-1" disabled={isSubmitting}>
          انصراف
        </Button>
      </div>
    </BottomSheet>
  );
}
