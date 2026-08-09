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

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  reserved: { label: "ثبت شده", cls: "reserved" },
  confirmed: { label: "تایید شده", cls: "confirmed" },
  pending: { label: "در انتظار", cls: "pending" },
  completed: { label: "انجام شده", cls: "completed" },
  cancelled: { label: "لغو شده", cls: "cancelled" },
};

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
    // blank transition while the App Router requests the same route again.
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
  // /bookings with pull-to-refresh, polling, and a detail sheet.
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
      await cancelBooking(id);
      toast.success("نوبت لغو شد");
      void refreshBookings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در لغو نوبت");
    }
  };

  if (!user) {
    return (
      <div className="qbf-page">
        <header className="qbf-head">
          <button type="button" className="qbf-round-btn" onClick={goBack} aria-label="بازگشت">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="qbf-mid">
            <span className="qbf-kicker">حساب کاربری</span>
            <h2 className="qbf-title">پروفایل</h2>
          </div>
          <span className="qbf-head-spacer" />
        </header>
        <div className="qbp-body">
          <div className="qbf-empty">
            <div className="qbf-empty-icon">
              <User className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3>وارد شوید</h3>
            <p>برای مشاهده پروفایل و نوبت‌های خود، با شماره موبایل وارد شوید.</p>
            <button type="button" className="qbf-empty-cta" onClick={() => router.push("/login")}>
              ورود
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initial = (user.name || user.phone || "م").trim().charAt(0);

  return (
    <div className="qbf-page">
      <header className="qbf-head">
        <button type="button" className="qbf-round-btn" onClick={goBack} aria-label="بازگشت">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="qbf-mid">
          <span className="qbf-kicker">حساب کاربری</span>
          <h2 className="qbf-title">پروفایل</h2>
        </div>
        <span className="qbf-head-spacer" />
      </header>

      <div className="qbp-body">
        <div className="qbp-avatar" aria-hidden="true">{initial}</div>

        <section className="qbp-profile-card" aria-labelledby="profile-details-title">
          <div className="qbp-section-heading">
            <div>
              <span className="qbp-section-kicker">حساب کاربری</span>
              <h3 id="profile-details-title">مشخصات شما</h3>
            </div>
            <User className="qbp-section-heading-icon" aria-hidden="true" />
          </div>

          <div className="qbp-row">
            <span className="qbf-rev-ic"><User className="h-4 w-4" aria-hidden="true" /></span>
            <div className="qbp-row-meta">
              <small>نام</small>
              {editing ? (
                <input
                  type="text"
                  className="qbp-edit-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !saving && saveEdit()}
                  placeholder="نام خود را وارد کنید"
                  autoFocus
                  aria-label="نام"
                />
              ) : (
                <b>{user.name || "بدون نام"}</b>
              )}
            </div>
            {editing ? (
              <div className="qbp-icon-actions">
                <button type="button" className="qbp-icon-btn primary" onClick={saveEdit} disabled={saving} aria-label="ذخیره نام" title="ذخیره نام">
                  {saving ? <span className="qbp-action-spinner" aria-hidden="true" /> : <Check aria-hidden="true" />}
                </button>
                <button type="button" className="qbp-icon-btn" onClick={cancelEdit} aria-label="انصراف از ویرایش نام" title="انصراف">
                  <X aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button type="button" className="qbp-icon-btn" onClick={startEdit} aria-label="ویرایش نام" title="ویرایش نام">
                <Pencil aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="qbp-row">
            <span className="qbf-rev-ic"><Phone className="h-4 w-4" aria-hidden="true" /></span>
            <div className="qbp-row-meta">
              <small>شماره موبایل</small>
              {editingPhone ? (
                <input
                  type="tel"
                  dir="ltr"
                  className="qbp-edit-input qbp-phone-input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !savingPhone && savePhone()}
                  placeholder="0912 345 6789"
                  autoFocus
                  aria-label="شماره موبایل"
                />
              ) : (
                <b className="qbp-phone-value" dir="ltr">{displayDigits(user.phone)}</b>
              )}
              {!editingPhone && (
                <span className="qbp-row-note">این شماره هویت ورود شماست؛ نوبت‌های قبلی با تغییر شماره به‌صورت خودکار منتقل می‌شوند.</span>
              )}
            </div>
            {editingPhone ? (
              <div className="qbp-icon-actions">
                <button type="button" className="qbp-icon-btn primary" onClick={savePhone} disabled={savingPhone} aria-label="ذخیره شماره موبایل" title="ذخیره شماره موبایل">
                  {savingPhone ? <span className="qbp-action-spinner" aria-hidden="true" /> : <Check aria-hidden="true" />}
                </button>
                <button type="button" className="qbp-icon-btn" onClick={cancelPhoneEdit} aria-label="انصراف از ویرایش شماره" title="انصراف">
                  <X aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button type="button" className="qbp-icon-btn" onClick={startPhoneEdit} aria-label="ویرایش شماره موبایل" title="ویرایش شماره موبایل">
                <Pencil aria-hidden="true" />
              </button>
            )}
          </div>
        </section>

        <section className="qbp-history-section" aria-labelledby="profile-history-title">
          <div className="qbp-sec-head">
            <div>
              <span className="qbp-section-kicker">رزروها</span>
              <h3 id="profile-history-title">نوبت‌های من</h3>
            </div>
            <button type="button" className="qbp-view-all" onClick={() => router.push("/bookings")}>
              همه نوبت‌ها
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

        {recentBookings.length === 0 ? (
          <div className="qbf-empty" style={{ marginTop: 4, padding: "24px 20px" }}>
            <div className="qbf-empty-icon">
              <Calendar className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3>نوبتی ندارید</h3>
            <p>هنوز نوبتی رزرو نکرده‌اید. همین حالا اولین نوبت خود را بگیرید.</p>
            <button type="button" className="qbf-empty-cta" onClick={() => router.push("/")}>
              رزرو نوبت
            </button>
          </div>
        ) : (
          <div className="qbp-recent-list">
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
                  className="qbp-book"
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
                  <div className="qbp-book-top">
                    <span className="qbf-rev-ic"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="qbp-book-name">
                      <b>{getServiceName(booking.service_id)}</b>
                      <small>{jalaliShort(booking.date_gregorian)}</small>
                    </span>
                    <span className={`qbp-status ${status.cls}`}><i aria-hidden="true" />{status.label}</span>
                  </div>
                  <div className="qbp-book-time">
                    <Clock aria-hidden="true" />
                    {formatJalaliTime(time)} تا {formatJalaliTime(endTime)}
                    <small>· {toPersianDigits(duration)} دقیقه</small>
                  </div>
                  <div className="qbp-book-foot">
                    <b>{price !== null ? compactToman(Number(price)) : "قیمت در سالن"}</b>
                    <span className="qbp-book-actions">
                      <small dir="ltr">#{booking.id.slice(-4).toUpperCase()}</small>
                      {CANCELABLE.has(booking.status) && (
                        <button
                          type="button"
                          className={`qbp-cancel${confirmingCancel === booking.id ? " confirm" : ""}`}
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

        <button type="button" className="qbp-logout" onClick={() => setConfirmLogout(true)}>
          <LogOut aria-hidden="true" />
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
