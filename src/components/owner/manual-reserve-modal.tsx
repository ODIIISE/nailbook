"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { normalizeDigits } from "@/lib/digits";
import { toPersianDigits, formatPrice } from "@/lib/jalali";
import { getIranWeekDay } from "@/lib/slots";
import { resolveSlotInterval, resolveSlotBuffer } from "@/lib/salon-settings";
import type { Service } from "@/lib/types";
import type { WorkingHours } from "@/lib/slots";

interface ManualReserveModalProps {
  date: Date;
  services: Service[];
  workingHours: WorkingHours;
  slotIntervalMinutes?: number;
  slotBufferMinutes?: number;
  /** Past customers for quick-pick (derived from bookings by the caller). */
  knownCustomers?: Array<{ name: string; phone: string }>;
  /** Assignable artists (staff directory). Absent/empty hides the picker. */
  artists?: Array<{ id: string; name: string; phone?: string; specialty?: string }>;
  onReserve: (data: {
    customer_name: string;
    customer_phone: string;
    service_id: string;
    start_time: string;
    end_time: string;
    artist_id?: string | null;
    note?: string;
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
  knownCustomers = [],
  artists = [],
  onReserve,
  onClose,
}: ManualReserveModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [artistId, setArtistId] = useState("");
  const [note, setNote] = useState("");
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
  // Shared clamps — identical to what the server enforces, so a valid form can
  // never be rejected with "مدت زمان با تنظیمات سالن مطابقت ندارد".
  const getEffectiveDuration = useCallback((duration: number) =>
    Math.ceil((duration + resolveSlotBuffer(slotBufferMinutes)) / resolveSlotInterval(slotIntervalMinutes)) * resolveSlotInterval(slotIntervalMinutes),
    [slotBufferMinutes, slotIntervalMinutes]
  );

  // Auto-calculate end time from start time + service duration (grid-aware)
  const [endTime, setEndTime] = useState(() =>
    selectedService ? calculateEndTime(startTime, getEffectiveDuration(selectedService.duration_minutes)) : ""
  );

  // The server accepts exactly start + effectiveDuration. Anything else is a
  // guaranteed 400, so the form gates on it and offers one-tap correction.
  const expectedEndTime = useMemo(
    () => selectedService ? calculateEndTime(startTime, getEffectiveDuration(selectedService.duration_minutes)) : "",
    [selectedService, startTime, getEffectiveDuration]
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
    endTime > startTime &&
    // An empty expectedEndTime means the slot would cross midnight
    // (calculateEndTime refuses) — never submit that.
    endTime === expectedEndTime
  );

  /* Quick-pick from past customers (v-2 search): match typed name/phone
     against previous bookings so repeat customers fill in with one tap. */
  const query = `${name.trim()}${normalizeDigits(phone)}`.trim();
  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    const seen = new Set<string>();
    const out: Array<{ name: string; phone: string }> = [];
    for (const c of knownCustomers) {
      if (out.length >= 5) break;
      if (seen.has(c.phone)) continue;
      if (c.name.includes(name.trim()) || normalizeDigits(c.phone).includes(normalizeDigits(phone))) {
        if (normalizeDigits(c.phone) === normalizeDigits(phone) && c.name === name.trim()) continue;
        seen.add(c.phone);
        out.push(c);
      }
    }
    return out;
  }, [knownCustomers, name, phone, query]);

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
        artist_id: artistId || null,
        note: note.trim(),
      });
    } catch {
      setSubmitError("ثبت رزرو انجام نشد؛ دوباره تلاش کنید");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet open={true} onClose={onClose} title="رزرو دستی">
      <div>
        <label className="field">
          <span>نام مشتری</span>
          <input className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام (اختیاری)"
          />
        </label>

        <label className="field" style={{ marginTop: 14 }}>
          <span>شماره موبایل</span>
          <input className="input ltr"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="۰۹۱۲۱۲۳۴۵۶۷"
            style={{ textAlign: "left" }}
          />
        </label>
        <p className="t-s" style={{ marginTop: 6 }}>
          اگر شماره جدید باشد، کاربر خودکار ساخته می‌شود
        </p>
        {suggestions.length > 0 && (
          <div className="list" style={{ marginTop: 8 }} role="listbox" aria-label="مشتریان قبلی">
            {suggestions.map((c) => (
              <button
                key={c.phone}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => { setName(c.name); setPhone(c.phone); }}
                className="row"
                style={{ width: "100%", padding: "11px 0", textAlign: "start" }}
              >
                <span style={{ flex: 1 }}>{c.name}</span>
                <span className="t-s ltr num">{toPersianDigits(c.phone)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="field" style={{ marginTop: 14 }}>
          <span>خدمت</span>
          {activeServices.length > 0 ? (
            <Select value={resolvedServiceId} id="mr-service" onValueChange={(val) => handleServiceChange(val as string)}>
              <SelectTrigger className="input" dir="rtl">
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
            <p className="empty">هنوز خدمتی برای رزرو فعال نشده است</p>
          )}
        </div>

        <div className="row" style={{ gap: 10, marginTop: 14 }}>
          <label className="field" style={{ flex: 1 }}>
            <span>از ساعت</span>
            <input
              className="input ltr"
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              style={{ textAlign: "center" }}
            />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span>تا ساعت</span>
            <input
              className="input ltr"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{ textAlign: "center" }}
            />
          </label>
        </div>

        {artists.length > 0 && (
          <div className="field" style={{ marginTop: 14 }}>
            <span>هنرمند</span>
            <Select value={artistId || "none"} id="mr-artist" onValueChange={(val) => setArtistId(val === "none" ? "" : String(val))}>
              <SelectTrigger className="input" dir="rtl">
                <SelectValue placeholder="بدون هنرمند">
                  {(value) => {
                    const artist = artists.find((item) => item.id === value);
                    return artist ? `${artist.name}${artist.specialty ? ` · ${artist.specialty}` : ""}` : "بدون هنرمند";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون هنرمند</SelectItem>
                {artists.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}{a.specialty ? ` - ${a.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <label className="field" style={{ marginTop: 14 }}>
          <span>یادداشت داخلی (اختیاری)</span>
          <input className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً حساسیت، درخواست خاص مشتری"
            maxLength={500}
          />
        </label>

        {selectedService && expectedEndTime && endTime !== expectedEndTime && (
          <div className="panel" style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span className="t-s">ساعت پایان باید <span className="ltr num">{toPersianDigits(expectedEndTime)}</span> باشد</span>
            <button
              type="button"
              onClick={() => setEndTime(expectedEndTime)}
              className="btn ghost sm"
            >
              اصلاح
            </button>
          </div>
        )}

        {endTime && startTime && endTime <= startTime && (
          <p role="alert" className="t-s center" style={{ color: "var(--wine-hi)", marginTop: 8 }}>ساعت پایان باید بعد از ساعت شروع باشد</p>
        )}
        {submitError && <p role="alert" className="t-s center" style={{ color: "var(--wine-hi)", marginTop: 8 }}>{submitError}</p>}
      </div>

      <div className="row" style={{ gap: 10, marginTop: 18 }}>
        <button type="button" className="btn pri" style={{ flex: 1 }} onClick={handleSubmit} disabled={!isValid || isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "در حال ثبت..." : selectedService ? `ثبت رزرو · ${formatPrice(Number(selectedService.price))}` : "ثبت رزرو"}
        </button>
        <button type="button" className="btn gl" style={{ flex: 1 }} onClick={onClose} disabled={isSubmitting}>
          انصراف
        </button>
      </div>
    </BottomSheet>
  );
}
