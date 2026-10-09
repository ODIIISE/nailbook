"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Copy, HelpCircle, Undo2, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  toPersianDigits,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliMonthDays,
  getJalaliMonthName,
  formatJalaliDateShort,
  JS_TO_IRAN_DAY,
} from "@/lib/jalali";
import type { WorkingHours } from "@/lib/slots";
import { generateTimeSlots } from "@/lib/slots";
import { getTehranDateKey, parseGregorianDateKey } from "@/lib/time";
import type { Service, Booking } from "@/lib/types";

interface ScheduleManagerProps {
  workingHours: WorkingHours;
  specificDaysOff: string[];
  earlyExtraHours: number;
  lateExtraHours: number;
  expandThreshold: number;
  proximityWindowHours: number;
  allowOverflow: boolean;
  overflowMinutes: number;
  slotIntervalMinutes: number;
  slotBufferMinutes: number;
  optimizationMode: "hybrid" | "legacy";
  suggestionLimit: number;
  minUsefulGapMinutes: number;
  cancelHours: number;
  leadMinutes: number;
  daysOffReasons: Record<string, string>;
  /** Active bookings per Gregorian date key — toggling a booked day off asks
     for confirmation first (v-2 booked-day gate). */
  dayBookingCounts?: Record<string, number>;
  /** Live preview inputs (v-2 پیش‌نمایش زنده): services + bookings +
     blocks rendered through the *draft* tunables below. */
  previewContext?: {
    services: Service[];
    bookings: Booking[];
    blockedTimes: Array<{ date_gregorian: string; start_time: string; end_time: string }>;
  };
  onSave: (
    hours: WorkingHours,
    daysOff: string[],
    extra: {
      early_extra_hours: number;
      late_extra_hours: number;
      expand_threshold: number;
      proximity_window_hours: number;
      allow_overflow: boolean;
      overflow_minutes: number;
      slot_interval_minutes: number;
      slot_buffer_minutes: number;
      optimization_mode: "hybrid" | "legacy";
      suggestion_limit: number;
      min_useful_gap_minutes: number;
      cancel_hours: number;
      lead_minutes: number;
      days_off_reasons: Record<string, string>;
    }
  ) => void | Promise<void>;
}

const IRAN_WEEK_DAYS = [
  { key: "sat", label: "شنبه" },
  { key: "sun", label: "یکشنبه" },
  { key: "mon", label: "دوشنبه" },
  { key: "tue", label: "سه‌شنبه" },
  { key: "wed", label: "چهارشنبه" },
  { key: "thu", label: "پنجشنبه" },
  { key: "fri", label: "جمعه" },
];

const PERSIAN_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

// ─── Help Tooltip ───

function Help({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help hover:text-foreground" />} />
      <TooltipContent side="top" className="w-52 text-small leading-relaxed p-2.5 rounded-none bg-card border border-border">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Setting Row ───

function SettingRow({
  label,
  help,
  children,
  description,
}: {
  label: string;
  help: string;
  children: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-caption font-normal">{label}</Label>
        <Help text={help} />
      </div>
      {children}
      {description && (
        <p className="text-small text-muted-foreground leading-relaxed">{description}</p>
      )}
    </div>
  );
}

// ─── Number Input ───

function NumberInput({
  value,
  onChange,
  min,
  max,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="w-20 text-center text-sm"
        dir="ltr"
      />
      {unit && <span className="text-small text-muted-foreground">{unit}</span>}
    </div>
  );
}

// ─── Jalali Month Grid ───

function JalaliMonthGrid({
  year,
  month,
  daysOff,
  onToggleDayOff,
}: {
  year: number;
  month: number;
  daysOff: string[];
  onToggleDayOff: (dateStr: string) => void;
}) {
  const daysInMonth = getJalaliMonthDays(year, month);
  const firstDayDate = jalaliToGregorian(year, month, 1);
  const firstDayJs = firstDayDate.getDay();
  const iranFirstDay = JS_TO_IRAN_DAY[firstDayJs];

  return (
    <Card className="p-4">
      <p className="text-sm font-normal text-foreground mb-2">
        {getJalaliMonthName(month)} {toPersianDigits(year)}
      </p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {PERSIAN_WEEKDAYS_SHORT.map((day) => (
          <div key={day} className="text-center text-small font-normal text-muted-foreground py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: iranFirstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const date = jalaliToGregorian(year, month, d);
          const dateStr = getTehranDateKey(date);
          const isOff = daysOff.includes(dateStr);
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <button
              key={d}
              onClick={() => onToggleDayOff(dateStr)}
              className={`
                min-h-11 rounded-none text-xs font-normal
                ${isOff
                  ? "bg-destructive text-destructive-foreground"
                  : isToday
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-secondary hover:bg-primary/10 text-foreground"
                }
              `}
            >
              {toPersianDigits(d)}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Helpers ───

// Render a stored "YYYY-MM-DD" day-off key as the user-facing Jalali date;
// fall back to the raw key for anything the parser can't canonicalize.
function formatDayOffChip(dateKey: string): string {
  const date = parseGregorianDateKey(dateKey);
  if (!date) return dateKey;
  const j = gregorianToJalali(date);
  return formatJalaliDateShort(j.jy, j.jm, j.jd);
}

// ─── Live Preview ───

// Shows what a customer would see under the *unsaved draft* tunables, so the
// owner can judge a setting before saving. Read-only: no booking happens here.
function EnginePreview({
  hours,
  daysOff,
  tunables,
  previewContext,
}: {
  hours: WorkingHours;
  daysOff: string[];
  tunables: {
    earlyExtraHours: number; lateExtraHours: number; expandThreshold: number;
    proximityWindowHours: number; allowOverflow: boolean; overflowMinutes: number;
    slotInterval: number; slotBuffer: number; optimizationMode: "hybrid" | "legacy";
    suggestionLimit: number; minUsefulGapMinutes: number; leadMinutes: number;
  };
  previewContext: NonNullable<ScheduleManagerProps["previewContext"]>;
}) {
  const { services, bookings, blockedTimes } = previewContext;
  const activeServices = services.filter((s) => s.is_active);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const service = activeServices.find((s) => s.id === serviceId) ?? activeServices[0] ?? null;

  const dateKey = (() => {
    const base = parseGregorianDateKey(getTehranDateKey(new Date()));
    return getTehranDateKey(new Date(base.getTime() + dayOffset * 864e5));
  })();
  const dayOptions = Array.from({ length: 10 }, (_, i) => {
    const base = parseGregorianDateKey(getTehranDateKey(new Date()));
    return getTehranDateKey(new Date(base.getTime() + i * 864e5));
  });

  const slots = (() => {
    if (!service) return [];
    const dayBookings = bookings
      .filter((b) => b.date_gregorian.split("T")[0] === dateKey
        && (b.status === "reserved" || b.status === "confirmed" || b.status === "in_progress" || b.status === "pending"))
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
    const dayLocks = blockedTimes
      .filter((l) => l.date_gregorian.split("T")[0] === dateKey)
      .map((l) => ({ start_time: l.start_time, end_time: l.end_time }));
    return generateTimeSlots(
      hours, parseGregorianDateKey(dateKey), Number(service.duration_minutes), 0,
      tunables.slotInterval, tunables.slotBuffer, dayBookings, dayLocks,
      {
        proximity_window_hours: tunables.proximityWindowHours,
        early_extra_hours: tunables.earlyExtraHours,
        late_extra_hours: tunables.lateExtraHours,
        expand_threshold: tunables.expandThreshold,
        allow_overflow: tunables.allowOverflow,
        overflow_minutes: tunables.overflowMinutes,
        optimization_mode: tunables.optimizationMode,
        suggestion_limit: tunables.suggestionLimit,
        min_useful_gap_minutes: tunables.minUsefulGapMinutes,
        lead_minutes: tunables.leadMinutes,
      },
      daysOff,
    );
  })();
  const available = slots.filter((s) => s.available);
  const suggested = available.filter((s) => s.suggested);

  return (
    <Card className="p-4">
      <h3 className="font-normal text-foreground mb-1">پیش‌نمایش زنده</h3>
      <p className="text-xs text-muted-foreground mb-4">
        مشتری با این تنظیمات (حتی ذخیره‌نشده)، این ساعت‌ها را می‌بیند.
      </p>
      {activeServices.length === 0 ? (
        <p className="text-sm text-muted-foreground">خدمت فعالی برای پیش‌نمایش نیست.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={service?.id || ""}
              onChange={(e) => setServiceId(e.target.value)}
              aria-label="خدمت پیش‌نمایش"
              className="h-11 rounded-none border border-input bg-card px-2 text-sm"
            >
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={dayOffset}
              onChange={(e) => setDayOffset(Number(e.target.value))}
              aria-label="روز پیش‌نمایش"
              className="h-11 rounded-none border border-input bg-card px-2 text-sm tabular-nums"
            >
              {dayOptions.map((key, i) => (
                <option key={key} value={i}>{formatDayOffChip(key)}</option>
              ))}
            </select>
          </div>
          {available.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">در این روز ساعتی نمایش داده نمی‌شود.</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label="پیش‌نمایش ساعت‌ها">
                {available.map((s) => (
                  <span
                    key={s.time}
                    className={`flex h-10 items-center justify-center rounded-none border text-sm tabular-nums ${s.suggested ? "border-primary/60 bg-primary/5" : "border-border"}`}
                  >
                    {toPersianDigits(s.time)}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                {toPersianDigits(available.length)} ساعت، {toPersianDigits(suggested.length)} پیشنهادی
              </p>
            </>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Main Component ───

export function ScheduleManager({
  workingHours,
  specificDaysOff,
  earlyExtraHours: initialEarly,
  lateExtraHours: initialLate,
  expandThreshold: initialThreshold,
  proximityWindowHours: initialProximity,
  allowOverflow: initialOverflow,
  overflowMinutes: initialOverflowMinutes,
  slotIntervalMinutes: initialInterval,
  slotBufferMinutes: initialBuffer,
  optimizationMode: initialOptimizationMode,
  suggestionLimit: initialSuggestionLimit,
  minUsefulGapMinutes: initialMinUsefulGapMinutes,
  cancelHours: initialCancel,
  leadMinutes: initialLead,
  daysOffReasons: initialReasons,
  dayBookingCounts = {},
  previewContext,
  onSave,
}: ScheduleManagerProps) {
  const [hours, setHours] = useState<WorkingHours>({ ...workingHours });
  const [daysOff, setDaysOff] = useState<string[]>([...specificDaysOff]);
  const [earlyExtraHours, setEarlyExtraHours] = useState(initialEarly);
  const [lateExtraHours, setLateExtraHours] = useState(initialLate);
  const [expandThreshold, setExpandThreshold] = useState(initialThreshold);
  const [proximityWindowHours, setProximityWindowHours] = useState(initialProximity);
  const [allowOverflow, setAllowOverflow] = useState(initialOverflow);
  const [overflowMinutes, setOverflowMinutes] = useState(initialOverflowMinutes);
  const [slotInterval, setSlotInterval] = useState(initialInterval);
  const [slotBuffer, setSlotBuffer] = useState(initialBuffer);
  const [optimizationMode, setOptimizationMode] = useState<"hybrid" | "legacy">(initialOptimizationMode);
  const [suggestionLimit, setSuggestionLimit] = useState(initialSuggestionLimit);
  const [minUsefulGapMinutes, setMinUsefulGapMinutes] = useState(initialMinUsefulGapMinutes);
  const [cancelHours, setCancelHours] = useState(initialCancel);
  const [leadMinutes, setLeadMinutes] = useState(initialLead);
  const [daysOffReasons, setDaysOffReasons] = useState<Record<string, string>>({ ...initialReasons });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AUDIT-012: an expiry redirect (or an accidental refresh) used to abandon
  // the whole edit. Persist dirty state per-tab; restore it on the way back.
  useEffect(() => {
    if (!hasChanges) return;
    try {
      sessionStorage.setItem("nailbook_schedule_draft", JSON.stringify({
        hours, daysOff, earlyExtraHours, lateExtraHours, expandThreshold,
        proximityWindowHours, allowOverflow, overflowMinutes, slotInterval,
        slotBuffer, optimizationMode, suggestionLimit, minUsefulGapMinutes,
        cancelHours, leadMinutes, daysOffReasons,
      }));
    } catch { /* private mode — nothing to stash */ }
  }, [hasChanges, hours, daysOff, earlyExtraHours, lateExtraHours, expandThreshold, proximityWindowHours, allowOverflow, overflowMinutes, slotInterval, slotBuffer, optimizationMode, suggestionLimit, minUsefulGapMinutes, cancelHours, leadMinutes, daysOffReasons]);
  useEffect(() => {
    // AUDIT-012: restore a session-stashed draft (expiry redirect or refresh
    // mid-edit). Deferred out of the effect body per house rule
    // (react-hooks/set-state-in-effect), same as booking-flow's look preset.
    let raw: string | null = null;
    try { raw = sessionStorage.getItem("nailbook_schedule_draft"); } catch { /* unavailable */ }
    if (!raw) return;
    queueMicrotask(() => {
      try {
        const d = JSON.parse(raw as string) as Partial<{
          hours: WorkingHours; daysOff: string[]; earlyExtraHours: number; lateExtraHours: number;
          expandThreshold: number; proximityWindowHours: number; allowOverflow: boolean;
          overflowMinutes: number; slotInterval: number; slotBuffer: number;
          optimizationMode: "hybrid" | "legacy"; suggestionLimit: number; minUsefulGapMinutes: number;
          cancelHours: number; leadMinutes: number; daysOffReasons: Record<string, string>;
        }>;
        if (d.hours) setHours(d.hours);
        if (d.daysOff) setDaysOff(d.daysOff);
        if (typeof d.earlyExtraHours === "number") setEarlyExtraHours(d.earlyExtraHours);
        if (typeof d.lateExtraHours === "number") setLateExtraHours(d.lateExtraHours);
        if (typeof d.expandThreshold === "number") setExpandThreshold(d.expandThreshold);
        if (typeof d.proximityWindowHours === "number") setProximityWindowHours(d.proximityWindowHours);
        if (typeof d.allowOverflow === "boolean") setAllowOverflow(d.allowOverflow);
        if (typeof d.overflowMinutes === "number") setOverflowMinutes(d.overflowMinutes);
        if (typeof d.slotInterval === "number") setSlotInterval(d.slotInterval);
        if (typeof d.slotBuffer === "number") setSlotBuffer(d.slotBuffer);
        if (d.optimizationMode === "hybrid" || d.optimizationMode === "legacy") setOptimizationMode(d.optimizationMode);
        if (typeof d.suggestionLimit === "number") setSuggestionLimit(d.suggestionLimit);
        if (typeof d.minUsefulGapMinutes === "number") setMinUsefulGapMinutes(d.minUsefulGapMinutes);
        if (typeof d.cancelHours === "number") setCancelHours(d.cancelHours);
        if (typeof d.leadMinutes === "number") setLeadMinutes(d.leadMinutes);
        if (d.daysOffReasons && typeof d.daysOffReasons === "object") setDaysOffReasons({ ...d.daysOffReasons });
        setHasChanges(true);
      } catch { /* corrupt — start clean */ }
    });
  }, []);

  useEffect(() => {
    // Don't wipe local edits when the parent re-fetches props.
    // The user must explicitly Save (which round-trips new props) or Discard
    // before a re-fetch can reset the form.
    if (hasChanges) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHours({ ...workingHours });
    setDaysOff([...specificDaysOff]);
    setEarlyExtraHours(initialEarly);
    setLateExtraHours(initialLate);
    setExpandThreshold(initialThreshold);
    setProximityWindowHours(initialProximity);
    setAllowOverflow(initialOverflow);
    setOverflowMinutes(initialOverflowMinutes);
    setSlotInterval(initialInterval);
    setSlotBuffer(initialBuffer);
    setOptimizationMode(initialOptimizationMode);
    setSuggestionLimit(initialSuggestionLimit);
    setMinUsefulGapMinutes(initialMinUsefulGapMinutes);
    setCancelHours(initialCancel);
    setLeadMinutes(initialLead);
    setDaysOffReasons({ ...initialReasons });
    setHasChanges(false);
  }, [workingHours, specificDaysOff, initialEarly, initialLate, initialThreshold, initialProximity, initialOverflow, initialOverflowMinutes, initialInterval, initialBuffer, initialOptimizationMode, initialSuggestionLimit, initialMinUsefulGapMinutes, initialCancel, initialLead, initialReasons, hasChanges]);

  const markChanged = () => setHasChanges(true);

  // Reset the form from server props (resolves the long-standing TODO): the
  // effect above deliberately keeps dirty state, so discarding must be explicit.
  const discardChanges = () => {
    try { sessionStorage.removeItem("nailbook_schedule_draft"); } catch { /* noop */ }
    setHasChanges(false);
    setHours({ ...workingHours });
    setDaysOff([...specificDaysOff]);
    setEarlyExtraHours(initialEarly);
    setLateExtraHours(initialLate);
    setExpandThreshold(initialThreshold);
    setProximityWindowHours(initialProximity);
    setAllowOverflow(initialOverflow);
    setOverflowMinutes(initialOverflowMinutes);
    setSlotInterval(initialInterval);
    setSlotBuffer(initialBuffer);
    setOptimizationMode(initialOptimizationMode);
    setSuggestionLimit(initialSuggestionLimit);
    setMinUsefulGapMinutes(initialMinUsefulGapMinutes);
    setCancelHours(initialCancel);
    setLeadMinutes(initialLead);
    setDaysOffReasons({ ...initialReasons });
  };

  const toggleDay = (key: string) => {
    const current = hours[key];
    const newHours = { ...hours };
    if (current === null) {
      const activeDays = Object.values(hours).filter((h): h is { open: string; close: string } => h !== null);
      if (activeDays.length > 0) {
        const freqOpen: Record<string, number> = {};
        const freqClose: Record<string, number> = {};
        for (const h of activeDays) {
          freqOpen[h.open] = (freqOpen[h.open] || 0) + 1;
          freqClose[h.close] = (freqClose[h.close] || 0) + 1;
        }
        const defaultOpen = Object.entries(freqOpen).sort((a, b) => b[1] - a[1])[0]?.[0] || "09:00";
        const defaultClose = Object.entries(freqClose).sort((a, b) => b[1] - a[1])[0]?.[0] || "17:00";
        newHours[key] = { open: defaultOpen, close: defaultClose };
      } else {
        newHours[key] = { open: "09:00", close: "17:00" };
      }
    } else {
      newHours[key] = null;
    }
    setHours(newHours);
    markChanged();
  };

  const updateTime = (key: string, field: "open" | "close", value: string) => {
    const current = hours[key];
    if (!current) return;
    setHours({ ...hours, [key]: { ...current, [field]: value } });
    markChanged();
  };

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const toHHMM = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  const addBreak = (key: string) => {
    const current = hours[key];
    if (!current) return;
    // Default to a 1-hour rest starting an hour after opening, clamped into
    // the shift. The server validator rejects anything outside open/close.
    const open = toMinutes(current.open);
    const close = toMinutes(current.close);
    const start = open + 60;
    const end = Math.min(start + 60, close);
    if (!(open <= start && start < end && end <= close)) return;
    const breaks = [...(current.breaks || []), { start: toHHMM(start), end: toHHMM(end) }];
    setHours({ ...hours, [key]: { ...current, breaks } });
    markChanged();
  };

  const updateBreak = (key: string, index: number, field: "start" | "end", value: string) => {
    const current = hours[key];
    if (!current || !current.breaks) return;
    const breaks = current.breaks.map((b, i) => (i === index ? { ...b, [field]: value } : b));
    setHours({ ...hours, [key]: { ...current, breaks } });
    markChanged();
  };

  const removeBreak = (key: string, index: number) => {
    const current = hours[key];
    if (!current || !current.breaks) return;
    const breaks = current.breaks.filter((_, i) => i !== index);
    setHours({ ...hours, [key]: { ...current, breaks } });
    markChanged();
  };

  const applyToAll = (sourceKey: string) => {
    const source = hours[sourceKey];
    if (!source) return;
    const newHours: WorkingHours = {};
    for (const day of IRAN_WEEK_DAYS) {
      newHours[day.key] = hours[day.key] !== null ? { ...source } : null;
    }
    setHours(newHours);
    markChanged();
  };

  const removeDayOff = (dateStr: string) => {
    setDaysOff((prev) => prev.filter((d) => d !== dateStr));
    setDaysOffReasons((prev) => {
      if (!(dateStr in prev)) return prev;
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
    markChanged();
  };

  const setDayOffReason = (dateStr: string, value: string) => {
    setDaysOffReasons((prev) => {
      const next = { ...prev };
      if (value.trim()) next[dateStr] = value.trim().slice(0, 100);
      else delete next[dateStr];
      return next;
    });
    markChanged();
  };

  const toggleSpecificDayOff = (dateStr: string) => {
    // Booked days need an explicit second tap: closing the day does not
    // cancel those bookings, so the owner must acknowledge them first.
    if (!daysOff.includes(dateStr) && (dayBookingCounts[dateStr] || 0) > 0) {
      setPendingDayOff(dateStr);
      return;
    }
    if (daysOff.includes(dateStr)) {
      removeDayOff(dateStr);
      return;
    }
    setDaysOff((prev) => [...prev, dateStr]);
    markChanged();
  };
  const [pendingDayOff, setPendingDayOff] = useState<string | null>(null);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(hours, daysOff, {
        early_extra_hours: earlyExtraHours,
        late_extra_hours: lateExtraHours,
        expand_threshold: expandThreshold,
        proximity_window_hours: proximityWindowHours,
        allow_overflow: allowOverflow,
        overflow_minutes: overflowMinutes,
        slot_interval_minutes: slotInterval,
        slot_buffer_minutes: slotBuffer,
        optimization_mode: optimizationMode,
        suggestion_limit: suggestionLimit,
        min_useful_gap_minutes: minUsefulGapMinutes,
        cancel_hours: cancelHours,
        lead_minutes: leadMinutes,
        days_off_reasons: daysOffReasons,
      });
      try { sessionStorage.removeItem("nailbook_schedule_draft"); } catch { /* noop */ }
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const now = new Date();
  const jalali = gregorianToJalali(now);
  const currentMonth = jalali.jm;
  const currentYear = jalali.jy;
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-normal text-foreground">ساعات کاری</h3>
          <p className="text-xs text-muted-foreground mt-1">
            روزهای فعال و ساعت‌ها را تنظیم کنید
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasChanges && (
            <Button
              size="sm"
              variant="ghost"
              onClick={discardChanges}
              disabled={isSaving}
              className="text-muted-foreground"
            >
              <Undo2 className="h-4 w-4 ms-1" />
              انصراف
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving} className="bg-foreground text-background hover:bg-foreground/90">
            <Save className={`h-4 w-4 ms-1 ${isSaving ? "" : ""}`} />
            {isSaving ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </div>
      </div>

      {/* ─── Section 1: Working Hours ─── */}
      <div className="space-y-3">
        {IRAN_WEEK_DAYS.map((day) => {
          const dayHours = hours[day.key];
          const isActive = dayHours !== null;

          return (
            <Card key={day.key} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch checked={isActive} onCheckedChange={() => toggleDay(day.key)} />
                  <span className="font-normal text-foreground">{day.label}</span>
                </div>
                {isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyToAll(day.key)}
                    className="text-xs text-muted-foreground"
                  >
                    <Copy className="h-3 w-3 ms-1" />
                    اعمال به همه
                  </Button>
                )}
              </div>

              {isActive && dayHours && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">شروع</Label>
                    <Input
                      type="time"
                      value={dayHours.open}
                      onChange={(e) => updateTime(day.key, "open", e.target.value)}
                      className="mt-1 text-center"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">پایان</Label>
                    <Input
                      type="time"
                      value={dayHours.close}
                      onChange={(e) => updateTime(day.key, "close", e.target.value)}
                      className="mt-1 text-center"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}
              {isActive && dayHours && (dayHours.breaks || []).length > 0 && (
                <div className="mt-2 space-y-2">
                  {(dayHours.breaks || []).map((b, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={b.start}
                        onChange={(e) => updateBreak(day.key, i, "start", e.target.value)}
                        className="text-center"
                        dir="ltr"
                        aria-label="شروع استراحت"
                      />
                      <span className="text-xs text-muted-foreground shrink-0">تا</span>
                      <Input
                        type="time"
                        value={b.end}
                        onChange={(e) => updateBreak(day.key, i, "end", e.target.value)}
                        className="text-center"
                        dir="ltr"
                        aria-label="پایان استراحت"
                      />
                      <button
                        type="button"
                        onClick={() => removeBreak(day.key, i)}
                        aria-label="حذف استراحت"
                        className="h-11 px-3 shrink-0 rounded-none text-small text-destructive hover:bg-destructive/10"
                      >
                        حذف
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {isActive && dayHours && (
                <button
                  type="button"
                  onClick={() => addBreak(day.key)}
                  className="mt-2 h-11 w-full rounded-none border border-dashed border-border text-small text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  افزودن استراحت روزانه
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {/* ─── Section 2: Slot Engine ─── */}
      <Card className="p-4">
        <h3 className="font-normal text-foreground mb-1">تنظیمات نوبت‌دهی</h3>
        <p className="text-xs text-muted-foreground mb-4">
          فاصله ساعت‌ها و زمان بین رزروها
        </p>
        <div className="space-y-5">
          <SettingRow
            label="فاصله نوبت‌ها"
            help="هر چند دقیقه یک ساعت نمایش داده شود. مثلاً ۱۵ یعنی ۱۲:۰۰، ۱۲:۱۵، ۱۲:۳۰..."
            description={`ساعت‌ها هر ${toPersianDigits(slotInterval)} دقیقه نمایش داده می‌شوند`}
          >
            <div className="flex gap-1.5">
              {[5, 10, 15, 20, 30, 60].map((v) => (
                <button
                  key={v}
                  onClick={() => { setSlotInterval(v); markChanged(); }}
                  className={`
                    min-h-11 min-w-[44px] px-2 rounded-none text-caption font-normal
                    ${slotInterval === v
                      ? "bg-foreground text-background"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                    }
                  `}
                >
                  {toPersianDigits(v)}
                </button>
              ))}
            </div>
          </SettingRow>

          <div className="border-t border-border/30" />

          <SettingRow
            label="زمان بین رزروها"
            help="زمان استراحت بین هر رزرو. مثلاً ۱۵ دقیقه یعنی بعد از هر رزرو ۱۵ دقیقه خالی می‌ماند."
            description={
              slotBuffer === 0
                ? "رزروها پشت سر هم بدون وقفه نمایش داده می‌شوند"
                : `بعد از هر رزرو ${toPersianDigits(slotBuffer)} دقیقه زمان خالی`
            }
          >
            <NumberInput
              value={slotBuffer}
              onChange={(v) => { setSlotBuffer(v); markChanged(); }}
              min={0}
              max={60}
              unit="دقیقه"
            />
          </SettingRow>
        </div>
      </Card>

      {/* ─── Section 3: Booking Policies ─── */}
      <Card className="p-4">
        <h3 className="font-normal text-foreground mb-1">سیاست‌های رزرو</h3>
        <p className="text-xs text-muted-foreground mb-4">
          مهلت لغو و حداقل زمان لازم برای ثبت رزرو
        </p>
        <div className="space-y-5">
          <SettingRow
            label="مهلت لغو"
            help="مشتری فقط تا این زمان قبل از شروع نوبت می‌تواند لغو کند. صفر یعنی همیشه آزاد."
            description={
              cancelHours === 0
                ? "لغو نوبت همیشه آزاد است"
                : `لغو فقط تا ${toPersianDigits(cancelHours)} ساعت قبل از شروع نوبت`
            }
          >
            <NumberInput
              value={cancelHours}
              onChange={(v) => { setCancelHours(v); markChanged(); }}
              min={0}
              max={72}
              unit="ساعت"
            />
          </SettingRow>

          <div className="border-t border-border/30" />

          <SettingRow
            label="حداقل زمان لازم"
            help="رزروهای امروز باید حداقل این‌قدر زودتر ثبت شوند. صفر یعنی تا دقیقه آخر."
            description={
              leadMinutes === 0
                ? "رزرو امروز تا دقیقه آخر ممکن است"
                : `رزرو امروز حداقل ${toPersianDigits(leadMinutes)} دقیقه زودتر`
            }
          >
            <NumberInput
              value={leadMinutes}
              onChange={(v) => { setLeadMinutes(v); markChanged(); }}
              min={0}
              max={240}
              unit="دقیقه"
            />
          </SettingRow>
        </div>
      </Card>

      {/* ─── Section 4: Expansion ─── */}
      <Card className="p-4">
        <h3 className="font-normal text-foreground mb-1">ساعت اضافی</h3>
        <p className="text-xs text-muted-foreground mb-4">
          باز شدن خودکار ساعت‌های بیشتر وقتی رزروها پر شود
        </p>
        <div className="space-y-5">
          <SettingRow
            label="آستانه فعال‌سازی"
            help="وقتی درصد رزروهای یک روز از این عدد بیشتر شود، ساعت‌های اضافی باز می‌شوند."
            description={
              <>
                وقتی <span className="font-normal text-foreground/70">{toPersianDigits(expandThreshold)}٪</span> روز پر شود، ساعت‌های اضافی قبل و بعد فعال می‌شوند
              </>
            }
          >
            <NumberInput
              value={expandThreshold}
              onChange={(v) => { setExpandThreshold(v); markChanged(); }}
              min={10}
              max={100}
              unit="٪"
            />
          </SettingRow>

          <div className="border-t border-border/30" />

          <div className="grid grid-cols-2 gap-4">
            <SettingRow
              label="ساعات قبل از شروع"
              help="مثلاً اگر کار ۱۰ شروع شود و این عدد ۲ باشد، از ۸ باز می‌شود."
            >
              <NumberInput
                value={earlyExtraHours}
                onChange={(v) => { setEarlyExtraHours(v); markChanged(); }}
                min={0}
                max={4}
                unit="ساعت"
              />
            </SettingRow>
            <SettingRow
              label="ساعات بعد از پایان"
              help="مثلاً اگر کار ۱۸ تمام شود و این عدد ۱ باشد، تا ۱۹ باز می‌شود."
            >
              <NumberInput
                value={lateExtraHours}
                onChange={(v) => { setLateExtraHours(v); markChanged(); }}
                min={0}
                max={4}
                unit="ساعت"
              />
            </SettingRow>
          </div>
        </div>
      </Card>

      {/* ─── Section 5: Smart Scheduling ─── */}
      <Card className="p-4">
        <h3 className="font-normal text-foreground mb-1">تنظیمات هوشمند</h3>
        <p className="text-xs text-muted-foreground mb-4">
          هوشمندسازی نمایش ساعت‌ها برای مشتریان
        </p>
        <div className="space-y-5">
          <SettingRow
            label="روش پیشنهاد ساعت‌ها"
            help="حالت هوشمند، بهترین چند ساعت را با توجه به فاصله‌های خالی و چسبیدن به رزروهای موجود پیشنهاد می‌دهد. حالت قدیمی فقط منطق قبلی را حفظ می‌کند."
            description={optimizationMode === "hybrid" ? "پیشنهادها محدود، مرتب‌شده و همراه با دلیل هستند" : "منطق پیشنهاددهی قبلی بدون امتیازدهی استفاده می‌شود"}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["hybrid", "legacy"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setOptimizationMode(mode); markChanged(); }}
                  className={`h-10 rounded-none text-small font-normal ${optimizationMode === mode ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                >
                  {mode === "hybrid" ? "هوشمند (پیشنهادی)" : "قدیمی"}
                </button>
              ))}
            </div>
          </SettingRow>

          <div className="border-t border-border/30" />

          <SettingRow
            label="تعداد ساعت‌های پیشنهادی"
            help="تعداد گزینه‌هایی که در بخش ساعت‌های پیشنهادی به مشتری نشان داده می‌شود. همه ساعت‌های معتبر همچنان قابل انتخاب هستند."
            description={`در حالت هوشمند ${toPersianDigits(suggestionLimit)} گزینه برجسته می‌شود`}
          >
            <NumberInput
              value={suggestionLimit}
              onChange={(v) => { setSuggestionLimit(v); markChanged(); }}
              min={1}
              max={10}
              unit="گزینه"
            />
          </SettingRow>

          <div className="border-t border-border/30" />

          <SettingRow
            label="حداقل فاصله مفید"
            help="فاصله‌های کوچک‌تر از این مقدار امتیاز کمتری می‌گیرند تا برنامه روزانه تکه‌تکه نشود."
            description={`فاصله‌های کمتر از ${toPersianDigits(minUsefulGapMinutes)} دقیقه کمتر پیشنهاد می‌شوند`}
          >
            <NumberInput
              value={minUsefulGapMinutes}
              onChange={(v) => { setMinUsefulGapMinutes(v); markChanged(); }}
              min={0}
              max={180}
              unit="دقیقه"
            />
          </SettingRow>

          <div className="border-t border-border/30" />

          <SettingRow
            label="فاصله نزدیکی"
            help="وقتی مشتری ساعت ۱۰ را رزرو می‌کند، ساعت‌های بعدی فقط در بازه ±۲ ساعت از ۱۰ نمایش داده می‌شوند."
            description={
              <>
                ساعت‌های پیشنهادی در فاصله <span className="font-normal text-foreground/70">±{toPersianDigits(proximityWindowHours)} ساعت</span> از رزرو قبلی نمایش داده می‌شوند
              </>
            }
          >
            <NumberInput
              value={proximityWindowHours}
              onChange={(v) => { setProximityWindowHours(v); markChanged(); }}
              min={1}
              max={8}
              unit="ساعت"
            />
          </SettingRow>

          <div className="border-t border-border/30" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-caption font-normal">تمدید ساعت کاری</Label>
                <Help text="اگر فعال شود، رزروها می‌توانند از ساعت پایان کاری فراتر بروند." />
              </div>
              <Switch
                checked={allowOverflow}
                onCheckedChange={(v) => { setAllowOverflow(v); markChanged(); }}
              />
            </div>
            <p className="text-small text-muted-foreground leading-relaxed">
              {allowOverflow
                ? `رزروها می‌توانند تا ${toPersianDigits(overflowMinutes)} دقیقه بعد از پایان کار ادامه داشته باشند`
                : "رزروها باید قبل از ساعت پایان کار تمام شوند"
              }
            </p>
            {allowOverflow && (
              <div className="flex items-center gap-3 mt-2">
                <Input
                  type="number"
                  min={0}
                  max={120}
                  step={15}
                  value={overflowMinutes}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (Number.isFinite(next)) { setOverflowMinutes(next); markChanged(); }
                  }}
                  className="w-20 text-center text-sm"
                  dir="ltr"
                />
                <span className="text-small text-muted-foreground">دقیقه</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Section 6: Live Preview ─── */}
      {previewContext && (
        <EnginePreview
          hours={hours}
          daysOff={daysOff}
          tunables={{
            earlyExtraHours, lateExtraHours, expandThreshold, proximityWindowHours,
            allowOverflow, overflowMinutes, slotInterval, slotBuffer,
            optimizationMode, suggestionLimit, minUsefulGapMinutes, leadMinutes,
          }}
          previewContext={previewContext}
        />
      )}

      {/* ─── Section 7: Days Off ─── */}
      <div>
        <h3 className="font-normal text-foreground mb-1">روزهای تعطیل</h3>
        <p className="text-xs text-muted-foreground mb-3">
          روی روزها کلیک کنید تا تعطیل شوند
        </p>

        {pendingDayOff && (
          <div className="mb-3 rounded-none border border-warning/40 bg-warning/10 p-3" role="alert">
            <p className="text-sm font-normal">
              این روز {toPersianDigits(dayBookingCounts[pendingDayOff] || 0)} نوبت فعال دارد
            </p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              نوبت‌ها لغو نمی‌شوند ولی روز برای رزرو جدید بسته می‌شود. بعد از تعطیل کردن با مشتری‌ها تماس بگیرید.
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDaysOff((prev) => [...prev, pendingDayOff]);
                  setPendingDayOff(null);
                  markChanged();
                }}
                className="h-11 flex-1 rounded-none bg-primary text-sm font-normal text-primary-foreground"
              >
                تعطیل شود
              </button>
              <button
                type="button"
                onClick={() => setPendingDayOff(null)}
                className="h-11 flex-1 rounded-none border border-border text-sm font-normal"
              >
                انصراف
              </button>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <JalaliMonthGrid
            year={currentYear}
            month={currentMonth}
            daysOff={daysOff}
            onToggleDayOff={toggleSpecificDayOff}
          />
          <JalaliMonthGrid
            year={nextYear}
            month={nextMonth}
            daysOff={daysOff}
            onToggleDayOff={toggleSpecificDayOff}
          />
        </div>

        {daysOff.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">
            {toPersianDigits(daysOff.length)} روز تعطیل انتخاب شده
          </p>
          <div className="flex flex-wrap gap-1">
            {[...daysOff].sort().slice(0, 10).map((d) => (
              <button
                key={d}
                onClick={() => toggleSpecificDayOff(d)}
                title={d}
                className="px-2 py-0.5 rounded-none text-small bg-destructive/10 text-destructive hover:bg-destructive/20"
              >
                {formatDayOffChip(d)} ×
              </button>
            ))}
              {daysOff.length > 10 && (
                <span className="text-small text-muted-foreground self-center">
                  +{toPersianDigits(daysOff.length - 10)} مورد دیگر
                </span>
              )}
            </div>
          </div>
        )}
        {daysOff.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">دلیل تعطیلی (اختیاری)</p>
            {[...daysOff].sort().map((d) => (
              <div key={d} className="flex items-center gap-2">
                <span className="text-small text-foreground shrink-0 w-20">{formatDayOffChip(d)}</span>
                <Input
                  value={daysOffReasons[d] || ""}
                  onChange={(e) => setDayOffReason(d, e.target.value)}
                  placeholder="مثلاً تعطیلات رسمی"
                  maxLength={100}
                  className="h-10"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
