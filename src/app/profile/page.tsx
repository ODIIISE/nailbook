"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, ArrowRight, Calendar, Check, Clock, LogOut, Pencil, Phone, Sparkles, User, X,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { displayDigits, normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { gregorianToJalali, toPersianDigits, formatJalaliTime } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";
import { compactToman } from "@/lib/pricing";

const STATUS_PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold";

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  reserved: { label: "ثبت شده", cls: "bg-primary/10 text-primary", dot: "bg-primary" },
  confirmed: { label: "تأیید شده", cls: "bg-success/10 text-success", dot: "bg-success" },
  pending: { label: "در انتظار", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  completed: { label: "انجام شده", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  cancelled: { label: "لغو شده", cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

function StatusPill({ status }: { status: { cls: string; dot: string; label: string } }) {
  return (
    <span className={`${STATUS_PILL_BASE} ${status.cls}`}>
      <i aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
      {status.label}
    </span>
  );
}

const JALALI_MONTHS = ["", "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function jalaliShort(dateKey: string) {
  const jalali = gregorianToJalali(parseGregorianDateKey(dateKey));
  return `${toPersianDigits(jalali.jd)} ${JALALI_MONTHS[jalali.jm]}`;
}

const CANCELABLE = new Set(["reserved", "confirmed"]);

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { bookings, services, cancelBooking, refreshBookings } = useSalon();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingPhone, setEditingPhone] = useState(false);
  const [editPhone, setEditPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const [confirmingCancel, setConfirmingCancel] = useState<string | null>(null);
  const cancelTimer = useRef<number | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    return () => {
      if (cancelTimer.current !== null) window.clearTimeout(cancelTimer.current);
    };
  }, []);

  useEffect(() => {
    // Keep the fallback navigation warm for direct visits to /profile. When
    // the user arrived from the homepage, router.back() below reuses the
    // already-rendered route and avoids a second RSC fetch altogether.
    router.prefetch("/");
  }, [router]);

  const goBack = () => {
    window.dispatchEvent(new Event("nailbook:back"));
    // In-app navigation already has the homepage in the browser history. Use
    // that entry rather than pushing/reloading the homepage, which avoids the
    // blank while the App Router requests the same route again.
    if (window.history.length > 1) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const startEdit = () => {
    setEditName(user?.name || "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditName(user?.name || "");
  };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name || !user) return;
    setSaving(true);
    const result = await updateProfile(name);
    setSaving(false);
    if (result.success) {
      setEditing(false);
      toast.success("نام با موفقیت به‌روزرسانی شد");
    } else {
      toast.error(result.error || "خطا در به‌روزرسانی پروفایل");
    }
  };

  const startPhoneEdit = () => {
    setEditPhone(user?.phone || "");
    setEditingPhone(true);
  };

  const cancelPhoneEdit = () => {
    setEditingPhone(false);
    setEditPhone(user?.phone || "");
  };

  const savePhone = async () => {
    if (!user) return;
    const clean = normalizeDigits(editPhone);
    if (!isValidIranianPhone(clean)) {
      toast.error("شماره موبایل معتبر نیست");
      return;
    }
    setSavingPhone(true);
    const result = await updateProfile(user.name, user.id, clean);
    setSavingPhone(false);
    if (result.success) {
      setEditingPhone(false);
      toast.success("شماره موبایل با موفقیت به‌روزرسانی شد");
      // The server re-linked past bookings to the new number — pull fresh data.
      void refreshBookings();
    } else {
      toast.error(result.error || "خطا در به‌روزرسانی شماره موبایل");
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  // Latest bookings (newest first), shown right on the profile so the user can
  // see and cancel appointments without leaving the hub. Full history lives at
  // /bookings with polling and a detail sheet.
  const recentBookings = useMemo(() => {
    if (!user) return [];
    return bookings
      .filter((b) => b.user_id === user.id || b.customer_phone === user.phone)
      .sort((a, b) => {
        const dateA = parseGregorianDateKey(a.date_gregorian).getTime();
        const dateB = parseGregorianDateKey(b.date_gregorian).getTime();
        if (dateA !== dateB) return dateB - dateA;
        return b.start_time.localeCompare(a.start_time);
      })
      .slice(0, 3);
  }, [bookings, user]);

  const getServiceName = (serviceId: string) => services.find((s) => s.id === serviceId)?.name || "نامعلوم";
  const getServicePrice = (serviceId: string) => services.find((s) => s.id === serviceId)?.price ?? null;

  const handleCancelBooking = async (id: string) => {
    if (confirmingCancel !== id) {
      setConfirmingCancel(id);
      if (cancelTimer.current !== null) window.clearTimeout(cancelTimer.current);
      cancelTimer.current = window.setTimeout(() => setConfirmingCancel(null), 2600);
      return;
    }
    if (cancelTimer.current !== null) {
      window.clearTimeout(cancelTimer.current);
      cancelTimer.current = null;
    }
    setConfirmingCancel(null);
    try {
      // cancelBooking catches its own errors and returns the server's guard
      // text on failure — show it instead of an endless-retry generic message.
      const result = await cancelBooking(id);
      if (result.success) {
        toast.success("نوبت لغو شد");
        void refreshBookings();
      } else {
        toast.error(result.error || "خطا در لغو نوبت — لطفاً دوباره تلاش کنید");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در لغو نوبت");
    }
  };

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3.5 pb-2 pt-3">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
            onClick={goBack}
            aria-label="بازگشت"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 overflow-hidden text-center">
            <span className="block text-xs font-extrabold text-primary">حساب کاربری</span>
            <h2 className="truncate text-lg font-bold">پروفایل</h2>
          </div>
          <span className="h-11 w-11" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-2">
          <div className="rounded-lg border border-border bg-card p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <User className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-extrabold">وارد شوید</h3>
            <p className="mx-auto mb-4 mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">برای مشاهده پروفایل و نوبت‌های خود، با شماره موبایل وارد شوید.</p>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground"
              onClick={() => router.push("/login")}
            >
              ورود
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initial = (user.name || user.phone || "م").trim().charAt(0);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
      <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3.5 pb-2 pt-3">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm"
          onClick={goBack}
          aria-label="بازگشت"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 overflow-hidden text-center">
          <span className="block text-xs font-extrabold text-primary">حساب کاربری</span>
          <h2 className="truncate text-lg font-bold">پروفایل</h2>
        </div>
        <span className="h-11 w-11" />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-2">
        <div className="mx-auto my-2.5 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-muted text-2xl font-bold text-foreground shadow-card" aria-hidden="true">{initial}</div>

        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card" aria-labelledby="profile-details-title">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 pb-3 pt-4">
            <div className="min-w-0">
              <span className="mb-0.5 block text-xs font-extrabold text-primary">حساب کاربری</span>
              <h3 id="profile-details-title" className="text-base font-extrabold">مشخصات شما</h3>
            </div>
            <User className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>

          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><User className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <small className="mb-0.5 block text-xs text-muted-foreground">نام</small>
              {editing ? (
                <input
                  type="text"
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !saving && saveEdit()}
                  placeholder="نام خود را وارد کنید"
                  autoFocus
                  aria-label="نام"
                />
              ) : (
                <b className="block break-words text-sm font-extrabold">{user.name || "بدون نام"}</b>
              )}
            </div>
            {editing ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" onClick={saveEdit} disabled={saving} aria-label="ذخیره نام" title="ذخیره نام">
                  {saving ? <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm" onClick={cancelEdit} aria-label="انصراف از ویرایش نام" title="انصراف">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm" onClick={startEdit} aria-label="ویرایش نام" title="ویرایش نام">
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><Phone className="h-4 w-4" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <small className="mb-0.5 block text-xs text-muted-foreground">شماره موبایل</small>
              {editingPhone ? (
                <input
                  type="tel"
                  dir="ltr"
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-left text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !savingPhone && savePhone()}
                  placeholder="0912 345 6789"
                  autoFocus
                  aria-label="شماره موبایل"
                />
              ) : (
                <b className="block text-sm font-extrabold tracking-wide" dir="ltr">{displayDigits(user.phone)}</b>
              )}
              {!editingPhone && (
                <span className="mt-1 block text-[11px] leading-relaxed text-muted-foreground">این شماره هویت ورود شماست؛ نوبت‌های قبلی با تغییر شماره به‌صورت خودکار منتقل می‌شوند.</span>
              )}
            </div>
            {editingPhone ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50" onClick={savePhone} disabled={savingPhone} aria-label="ذخیره شماره موبایل" title="ذخیره شماره موبایل">
                  {savingPhone ? <span className="h-3.5 w-3.5 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm" onClick={cancelPhoneEdit} aria-label="انصراف از ویرایش شماره" title="انصراف">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm" onClick={startPhoneEdit} aria-label="ویرایش شماره موبایل" title="ویرایش شماره موبایل">
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        <section className="mt-6" aria-labelledby="profile-history-title">
          <div className="mb-3 flex items-end justify-between gap-2.5">
            <div className="min-w-0">
              <span className="mb-0.5 block text-xs font-extrabold text-primary">رزروها</span>
              <h3 id="profile-history-title" className="text-base font-extrabold">نوبت‌های من</h3>
            </div>
            <button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-2 text-xs font-extrabold text-primary" onClick={() => router.push("/bookings")}>
              همه نوبت‌ها
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

        {recentBookings.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center shadow-card">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Calendar className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-extrabold">نوبتی ندارید</h3>
            <p className="mx-auto mb-4 mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">هنوز نوبتی رزرو نکرده‌اید. همین حالا اولین نوبت خود را بگیرید.</p>
            <button type="button" className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-primary-foreground" onClick={() => router.push("/")}>
              رزرو نوبت
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {recentBookings.map((booking) => {
              const status = STATUS_MAP[booking.status] || STATUS_MAP.pending;
              const time = booking.start_time.slice(0, 5);
              const endTime = booking.end_time.slice(0, 5);
              const startM = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
              const endM = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1]);
              const duration = endM >= startM ? endM - startM : endM + 24 * 60 - startM;
              const price = getServicePrice(booking.service_id);

              return (
                <div
                  key={booking.id}
                  className="w-full rounded-lg border border-border bg-card p-4 shadow-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push("/bookings")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push("/bookings");
                    }
                  }}
                  aria-label={`مشاهده نوبت ${getServiceName(booking.service_id)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-sm font-bold">{getServiceName(booking.service_id)}</b>
                      <small className="mt-0.5 block text-[11px] text-muted-foreground">{jalaliShort(booking.date_gregorian)}</small>
                    </span>
                    <StatusPill status={status} />
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatJalaliTime(time)} تا {formatJalaliTime(endTime)}</span>
                    <span>· {toPersianDigits(duration)} دقیقه</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <b className="text-sm font-extrabold">{price !== null ? compactToman(Number(price)) : "قیمت در سالن"}</b>
                    <span className="flex items-center gap-2.5">
                      <small dir="ltr" className="text-[10px] font-bold text-muted-foreground">#{booking.id.slice(-4).toUpperCase()}</small>
                      {CANCELABLE.has(booking.status) && (
                        <button
                          type="button"
                          className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-[11px] font-extrabold ${
                            confirmingCancel === booking.id
                              ? "bg-destructive text-white"
                              : "border border-border bg-muted text-foreground"
                          }`}
                          onClick={(e) => { e.stopPropagation(); handleCancelBooking(booking.id); }}
                        >
                          {confirmingCancel === booking.id ? "تأیید لغو؟" : "لغو"}
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </section>

        <button
          type="button"
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 text-sm font-extrabold text-destructive"
          onClick={() => setConfirmLogout(true)}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          خروج از حساب
        </button>
      </div>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="max-w-[300px] rounded-2xl p-5 ring-0 border-border shadow-elevated">
          <AlertDialogHeader>
            <AlertDialogTitle>خروج از حساب</AlertDialogTitle>
            <AlertDialogDescription>
              مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟ نوبت‌های شما محفوظ می‌ماند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleLogout}>خروج</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
