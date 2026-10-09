"use client";

import { useState, useMemo } from "react";
import { Phone, MessageSquare, Wrench, Calendar, Clock, DollarSign, Trash2, AlertTriangle, CheckCircle2, XCircle, Loader } from "lucide-react";
import { Monogram } from "@/components/ui/nail";
import { formatPrice, toPersianDigits, formatJalaliDateShort, gregorianToJalali, PERSIAN_MONTHS } from "@/lib/jalali";
import { calculateBookingPrice } from "@/lib/pricing";
import { STATUS_CONFIG, STATUS_CONFIG_DARK } from "@/lib/design-tokens";
import { VALID_TRANSITIONS } from "@/lib/constants";
import { parseGregorianDateKey, getTehranDateKey } from "@/lib/time";
import { generateTimeSlots, type WorkingHours } from "@/lib/slots";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Booking, Service, Addon } from "@/lib/types";

interface BookingModalProps {
  booking: Booking;
  services: Service[];
  addons: Addon[];
  isPaid: boolean;
  /** Display-only completed-booking count for this customer (computed by the
     caller from the loaded bookings list) — mirrors the v-2 drawer history
     line. No-show is omitted: the backend status constraint has no no-show
     state, so a permanent "۰ غیبت" would be fake precision. */
  customerHistory?: { completed: number };
  /** Reschedule support (v-2 جابه‌جایی): engine context + server mover.
     When absent the move UI stays hidden and the drawer is unchanged. */
  rescheduleContext?: {
    workingHours: WorkingHours;
    bookings: Booking[];
    blockedTimes: Array<{ date_gregorian: string; start_time: string; end_time: string }>;
    specificDaysOff: string[];
    engine: {
      slot_interval_minutes: number; slot_buffer_minutes: number;
      proximity_window_hours: number; early_extra_hours: number; late_extra_hours: number;
      expand_threshold: number; allow_overflow: boolean; overflow_minutes: number;
      optimization_mode: "hybrid" | "legacy"; suggestion_limit: number; min_useful_gap_minutes: number;
    };
  };
  onReschedule?: (date_gregorian: string, start_time: string, end_time: string) => Promise<{ success: boolean; error?: string }>;
  onTogglePaid: () => void;
  /** Hide the paid toggle when the viewer lacks bookings.paid (artists). */
  canTogglePaid?: boolean;
  /** Assignable artists for the meta editor. Empty hides the artist picker. */
  artists?: Array<{ id: string; name: string; specialty?: string }>;
  /** Persist note/artist edits (PATCH meta). Absent hides the editor. */
  onUpdateMeta?: (data: { artist_id: string | null; note: string }) => Promise<{ success: boolean; error?: string }>;
  onStatusChange: (status: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  reserved: Clock,
  confirmed: CheckCircle2,
  completed: CheckCircle2,
  cancelled: XCircle,
  noshow: AlertTriangle,
  in_progress: Loader,
  pending: Clock,
};

const ALL_STATUS_OPTIONS: { value: string; label: string; Icon: typeof CheckCircle2 }[] = Object.entries(
  STATUS_CONFIG
).map(([value, { label }]) => ({
  value,
  label,
  Icon: STATUS_ICONS[value] || Clock,
}));

/** Single warm-dark theme: status colors always resolve from the dark
 *  overrides (the light hexes fail AA on the dark popover). */
function statusColorFor(value: string): string {
  const config = { ...STATUS_CONFIG, ...STATUS_CONFIG_DARK };
  return config[value]?.color ?? STATUS_CONFIG[value]?.color ?? STATUS_CONFIG.pending.color;
}

export function BookingModal({ booking, services, addons, isPaid, customerHistory, rescheduleContext, onReschedule, onTogglePaid, canTogglePaid = true, artists = [], onUpdateMeta, onStatusChange, onDelete, onClose }: BookingModalProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaArtistId, setMetaArtistId] = useState("");
  const [metaNote, setMetaNote] = useState("");
  const [metaError, setMetaError] = useState("");
  const [metaSaving, setMetaSaving] = useState(false);
  const canEditMeta = booking.status !== "cancelled" && booking.status !== "completed" && !!onUpdateMeta;

  const startMetaEdit = () => {
    setMetaArtistId(booking.artist_id ?? "");
    setMetaNote(booking.note ?? "");
    setMetaError("");
    setEditingMeta(true);
  };

  const saveMetaEdit = async () => {
    if (!onUpdateMeta || metaSaving) return;
    setMetaSaving(true);
    setMetaError("");
    try {
      const result = await onUpdateMeta({ artist_id: metaArtistId || null, note: metaNote.trim() });
      if (result.success) {
        setEditingMeta(false);
      } else {
        setMetaError(result.error || "به‌روزرسانی انجام نشد");
      }
    } finally {
      setMetaSaving(false);
    }
  };
  const [rescheduling, setRescheduling] = useState(false);
  const [reschedDate, setReschedDate] = useState(() => booking.date_gregorian.split("T")[0]);
  const [reschedError, setReschedError] = useState("");
  const [isMoving, setIsMoving] = useState(false);
  // In-flight flag: disables status/paid controls while a write runs so a
  // double-tap cannot queue opposite writes for a net no-op.
  const [isMutating, setIsMutating] = useState(false);

  const runMutation = async (action: () => void | Promise<void>) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      await action();
    } finally {
      setIsMutating(false);
    }
  };
  const currentStatus = booking.status;
  const allowedTransitions = useMemo(() => VALID_TRANSITIONS[currentStatus] || [], [currentStatus]);
  const statusOptions = useMemo(
    () => ALL_STATUS_OPTIONS
      .filter((opt) => allowedTransitions.includes(opt.value))
      .map((opt) => ({ ...opt, color: statusColorFor(opt.value) })),
    [allowedTransitions]
  );

  const jalali = gregorianToJalali(parseGregorianDateKey(booking.date_gregorian));
  const shortDate = formatJalaliDateShort(jalali.jy, jalali.jm, jalali.jd);
  const price = calculateBookingPrice(booking, services, addons);
  const startMinutes = parseInt(booking.start_time.split(":")[0]) * 60 + parseInt(booking.start_time.split(":")[1]);
  const endMinutes = parseInt(booking.end_time.split(":")[0]) * 60 + parseInt(booking.end_time.split(":")[1]);
  const duration = endMinutes >= startMinutes ? endMinutes - startMinutes : (endMinutes + 24 * 60) - startMinutes;
  const selectedAddons = (booking.selected_addons || []).map((id) => addons.find((a) => a.id === id)).filter(Boolean);
  const statusConfigBase = ALL_STATUS_OPTIONS.find((s: { value: string }) => s.value === currentStatus) || ALL_STATUS_OPTIONS[0];
  const statusConfig = { ...statusConfigBase, color: statusColorFor(currentStatus) };
  const shortId = `BK-${booking.id.slice(-6).toUpperCase()}`;
  const createdAtTime = booking.created_at ? new Date(booking.created_at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "";

  /* Reschedule (v-2 RP): move preserving duration, validated atomically by
     PATCH /api/owner/bookings. Slot list excludes this booking itself. */
  const canReschedule = booking.status !== "cancelled" && booking.status !== "completed" && rescheduleContext && onReschedule;
  const reschedDays = useMemo(() => {
    const base = parseGregorianDateKey(getTehranDateKey(new Date()));
    return Array.from({ length: 14 }, (_, i) => getTehranDateKey(new Date(base.getTime() + i * 864e5)));
  }, []);
  const reschedSlots = useMemo(() => {
    if (!rescheduling || !rescheduleContext) return [];
    const ctx = rescheduleContext;
    const dayBookings = ctx.bookings
      .filter((b) => b.date_gregorian.split("T")[0] === reschedDate
        && b.id !== booking.id
        && (b.status === "reserved" || b.status === "confirmed" || b.status === "in_progress" || b.status === "pending"))
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time }));
    const dayLocks = ctx.blockedTimes
      .filter((l) => l.date_gregorian.split("T")[0] === reschedDate)
      .map((l) => ({ start_time: l.start_time, end_time: l.end_time }));
    return generateTimeSlots(
      ctx.workingHours, parseGregorianDateKey(reschedDate), duration, 0,
      ctx.engine.slot_interval_minutes ?? 15, ctx.engine.slot_buffer_minutes ?? 0,
      dayBookings, dayLocks,
      {
        proximity_window_hours: ctx.engine.proximity_window_hours,
        early_extra_hours: ctx.engine.early_extra_hours,
        late_extra_hours: ctx.engine.late_extra_hours,
        expand_threshold: ctx.engine.expand_threshold,
        allow_overflow: ctx.engine.allow_overflow,
        overflow_minutes: ctx.engine.overflow_minutes,
        optimization_mode: ctx.engine.optimization_mode,
        suggestion_limit: ctx.engine.suggestion_limit,
        min_useful_gap_minutes: ctx.engine.min_useful_gap_minutes,
      },
      ctx.specificDaysOff,
    ).filter((s) => s.available);
  }, [rescheduling, reschedDate, rescheduleContext, booking.id, duration]);
  const handleMove = async (start: string) => {
    if (!onReschedule || isMoving) return;
    const [h, m] = start.split(":").map(Number);
    const endMin = (h || 0) * 60 + (m || 0) + duration;
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`;
    setIsMoving(true);
    setReschedError("");
    try {
      const r = await onReschedule(reschedDate, start, end);
      if (r.success) onClose();
      else setReschedError(r.error || "جابه‌جایی انجام نشد");
    } finally {
      setIsMoving(false);
    }
  };

  /* Category icon tints: neutral tokens (same recipe as customer list rows);
     price keeps its semantic warning tint. Status colors stay categorical via
     design-tokens (STATUS_CONFIG). */
  const paidColor = "text-success";
  const deleteColor = "text-destructive";
  const deleteHover = "text-destructive";

  return (
    <>
    <BottomSheet open onClose={onClose} title="جزئیات نوبت" sub={<span className="ltr num t-s">{shortId}</span>}>
        {/* Customer */}
        <div className="row" style={{ justifyContent: "space-between", padding: "2px 0 4px" }}>
          <div className="row" style={{ gap: 10 }}>
            <Monogram name={booking.customer_name} size={44} />
            <div>
              <div style={{ fontSize: 16 }}>{booking.customer_name}</div>
              <div className="t-s ltr num">{toPersianDigits(booking.customer_phone)}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button onClick={() => window.open(`sms:${booking.customer_phone}`, "_self")}
              aria-label={`ارسال پیامک به ${booking.customer_name || booking.customer_phone}`}
              className="iconbtn bare">
              <MessageSquare size={17} strokeWidth={1.5} />
            </button>
            <button onClick={() => window.open(`tel:${booking.customer_phone}`, "_self")}
              aria-label={`تماس با ${booking.customer_name || booking.customer_phone}`}
              className="iconbtn bare">
              <Phone size={17} strokeWidth={1.5} />
            </button>
          </div>
        </div>
        {customerHistory && (
          <p className="text-small text-muted-foreground mt-2 mb-3">
            سابقه این مشتری: {toPersianDigits(customerHistory.completed)} نوبت انجام‌شده
          </p>
        )}
        {(booking.artist_name || booking.note || canEditMeta) && (
          <div className="mt-2 mb-3 space-y-1">
            {!editingMeta && (
              <>
                {booking.artist_name && (
                  <p className="text-small text-muted-foreground">
                    هنرمند: <span className="text-foreground font-normal">{booking.artist_name}</span>
                  </p>
                )}
                {booking.note && (
                  <p className="text-small text-muted-foreground">
                    یادداشت: <span className="text-foreground">{booking.note}</span>
                  </p>
                )}
                {canEditMeta && (
                  <button
                    type="button"
                    onClick={startMetaEdit}
                    className="text-small text-primary hover:underline"
                  >
                    {booking.artist_name || booking.note ? "ویرایش هنرمند / یادداشت" : "افزودن هنرمند / یادداشت"}
                  </button>
                )}
              </>
            )}
            {editingMeta && (
              <div className="panel" style={{ marginTop: 10 }}>
                {artists.length > 0 && (
                  <label className="field">
                    <span>هنرمند</span>
                    <select
                      className="input"
                      value={metaArtistId || "none"}
                      onChange={(e) => setMetaArtistId(e.target.value === "none" ? "" : e.target.value)}
                    >
                      <option value="none">بدون هنرمند</option>
                      {artists.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}{a.specialty ? ` - ${a.specialty}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="field" style={{ marginTop: 12 }}>
                  <span>یادداشت داخلی</span>
                  <input
                    className="input"
                    value={metaNote}
                    onChange={(e) => setMetaNote(e.target.value)}
                    placeholder="مثلاً حساسیت، درخواست خاص مشتری"
                    maxLength={500}
                  />
                </label>
                {metaError && <p role="alert" className="t-s" style={{ color: "var(--wine-hi)", marginTop: 8 }}>{metaError}</p>}
                <div className="row" style={{ gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={saveMetaEdit}
                    disabled={metaSaving}
                    className="btn pri sm"
                    style={{ flex: 1 }}
                  >
                    {metaSaving ? "در حال ذخیره..." : "ذخیره"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingMeta(false)}
                    disabled={metaSaving}
                    className="btn gl sm"
                    style={{ flex: 1 }}
                  >
                    انصراف
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Details */}
        <div className="list" style={{ marginTop: 12 }}>
          <div className="sum">
            <span className="row" style={{ gap: 8 }}>
              <Wrench size={15} strokeWidth={1.5} className="mute" />
              {booking.service?.name || "نامشخص"}
            </span>
            {selectedAddons.length > 0 && (
              <span className="row" style={{ gap: 6 }}>
                {selectedAddons.map((addon) => (
                  <span key={addon!.id} className="badge tone-mute">{addon!.name}</span>
                ))}
              </span>
            )}
          </div>

          {/* Date & Time */}
          <div className="sum">
            <span className="row" style={{ gap: 8 }}>
              <Calendar size={15} strokeWidth={1.5} className="mute" />
              {shortDate}
            </span>
            <span className="t-s num">
              {toPersianDigits(booking.start_time.slice(0, 5))} – {toPersianDigits(booking.end_time.slice(0, 5))} · {toPersianDigits(duration)} دقیقه
            </span>
          </div>

          {/* Price */}
          <div className="sum">
            <span className="row" style={{ gap: 8 }}>
              <DollarSign size={15} strokeWidth={1.5} className="mute" />
              هزینه
            </span>
            <b className="num" style={{ fontWeight: 400, color: "var(--gold)" }}>{formatPrice(Number(price))}</b>
          </div>
        </div>

        {/* Status + Paid Toggle */}
        <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
          <DropdownMenu>
            <DropdownMenuTrigger className="chip">
              <statusConfig.Icon size={15} strokeWidth={1.5} style={{ color: statusConfig.color }} />
              <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[140px]">
              {statusOptions.length === 0 ? (
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground text-small">بدون تغییر وضعیت</span>
                </DropdownMenuItem>
              ) : statusOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  disabled={isMutating}
                  onClick={() => runMutation(() => onStatusChange(opt.value))}
                  className="gap-2"
                >
                  <opt.Icon className="h-3.5 w-3.5" style={{ color: opt.color }} />
                  <span style={{ color: opt.color }}>{opt.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {canTogglePaid && (
          <button
            onClick={() => runMutation(onTogglePaid)}
            disabled={isMutating}
            aria-busy={isMutating}
            aria-label={isPaid ? "علامت‌گذاری به عنوان پرداخت‌نشده" : "علامت‌گذاری به عنوان پرداخت‌شده"}
            className="flex items-center gap-2 disabled:text-foreground/70"
          >
            <span className={`text-small font-normal ${isPaid ? paidColor : "text-muted-foreground"}`}>{isPaid ? "پرداخت شده" : "پرداخت نشده"}</span>
            <div className={`w-9 h-5 rounded-full relative`} style={{ backgroundColor: isPaid ? paidColor as string : "var(--muted)" }}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background ${isPaid ? "end-0.5" : "end-[18px]"}`} />
            </div>
          </button>
          )}
        </div>

        {/* Actions */}
        <div className="row" style={{ gap: 10, marginTop: 16 }}>
          {canReschedule && (
            <button onClick={() => { setRescheduling((v) => !v); setReschedError(""); }}
              aria-expanded={rescheduling}
              className="btn gl sm"
              style={{ flex: 1 }}>
              <Calendar size={16} strokeWidth={1.5} />
              جابه‌جایی
            </button>
          )}
          <button onClick={() => setDeleteOpen(true)}
            className="btn danger sm"
            style={{ flex: 1 }}>
            <Trash2 size={16} strokeWidth={1.5} />
            حذف نوبت
          </button>
        </div>

        {canReschedule && rescheduling && (
          <div className="panel" style={{ marginTop: 12 }}>
            <div className="row" style={{ gap: 8, overflowX: "auto", paddingBottom: 10 }}>
              {reschedDays.map((key) => {
                const j = gregorianToJalali(parseGregorianDateKey(key));
                const sel = key === reschedDate;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setReschedDate(key)}
                    aria-pressed={sel}
                    aria-label={`${toPersianDigits(j.jd)} ${PERSIAN_MONTHS[j.jm - 1]}`}
                    className={`chip${sel ? " on" : ""}`}
                    style={{ flex: "none", flexDirection: "column", gap: 2, minHeight: 56, minWidth: 58 }}
                  >
                    <b className="num" style={{ fontWeight: 400, fontSize: 17 }}>{toPersianDigits(j.jd)}</b>
                    <span className="mute" style={{ fontSize: 11 }}>{PERSIAN_MONTHS[j.jm - 1].slice(0, 5)}</span>
                  </button>
                );
              })}
            </div>
            {reschedSlots.length === 0 ? (
              <p className="empty">در این روز ساعت آزادی نیست.</p>
            ) : (
              <div className="slots">
                {reschedSlots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={isMoving}
                    onClick={() => handleMove(s.time)}
                    className="slot num"
                  >
                    {toPersianDigits(s.time)}
                  </button>
                ))}
              </div>
            )}
            {reschedError && (
              <p role="alert" className="t-s center" style={{ color: "var(--wine-hi)", marginTop: 8 }}>{reschedError}</p>
            )}
          </div>
        )}

        {/* Created at */}
        {createdAtTime && (
          <p className="t-s center" style={{ marginTop: 12 }}>
            ثبت‌شده در ساعت {createdAtTime}
          </p>
        )}
      </BottomSheet>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="max-w-[300px] bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" style={{ color: deleteColor as string }}>
              <AlertTriangle className="h-4 w-4" />
              حذف نوبت
            </AlertDialogTitle>
            <AlertDialogDescription className="text-small" style={{ color: `${deleteColor}B3` }}>
              نوبت لغو می‌شود. در صورت نیاز می‌توانید بعداً آن را دوباره فعال کنید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { onDelete(booking.id); onClose(); }}
              className="text-small font-normal text-white" style={{ backgroundColor: deleteColor as string }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = deleteHover as string)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = deleteColor as string)}>
              بله، حذف
            </AlertDialogAction>
            <AlertDialogCancel className="bg-muted text-small font-normal border-0">
              انصراف
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
