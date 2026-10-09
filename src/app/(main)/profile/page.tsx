"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { SalonGuard } from "@/components/ui/salon-guard";
import { Switch } from "@/components/ui/switch";
import { Confirm } from "@/components/ui/confirm";
import { Monogram } from "@/components/ui/nail";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { toast } from "sonner";
import { displayDigits, normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { toPersianDigits, formatPrice } from "@/lib/jalali";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { bookings, services, refreshBookings } = useSalon();

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [phone, setPhone] = useState(user?.phone || "");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const myBookings = useMemo(() => {
    if (!user) return [];
    return bookings.filter((b) => b.user_id === user.id || b.customer_phone === user.phone);
  }, [bookings, user]);
  const done = useMemo(() => myBookings.filter((b) => b.status === "completed"), [myBookings]);
  const spend = useMemo(
    () =>
      done.reduce(
        (sum, b) => sum + Number(b.price_total ?? services.find((s) => s.id === b.service_id)?.price ?? 0),
        0
      ),
    [done, services]
  );

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3 pb-2 pt-3">
          <button type="button" className="iconbtn" onClick={() => router.push("/")} aria-label="بازگشت">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="h-m truncate text-center">پروفایل</h2>
          <span className="h-11 w-11" />
        </header>
        <div className="empty">
          برای مشاهده پروفایل وارد شوید.
          <br />
          <button type="button" className="btn pri sm" style={{ marginTop: 16 }} onClick={() => router.push("/login")}>
            ورود / ثبت‌نام
          </button>
        </div>
      </div>
    );
  }

  const saveName = async () => {
    if (name.trim() === user.name || name.trim().length < 2) return;
    setSavingName(true);
    const r = await updateProfile(name.trim());
    setSavingName(false);
    if (!r.success) toast.error(r.error || "ذخیره نشد");
    else toast.success("ذخیره شد");
  };

  const savePhone = async () => {
    const clean = normalizeDigits(phone);
    if (!isValidIranianPhone(clean)) {
      toast.error("شماره موبایل معتبر نیست");
      return;
    }
    setSavingPhone(true);
    const r = await updateProfile(user.name, user.id, clean);
    setSavingPhone(false);
    if (!r.success) toast.error(r.error || "ذخیره نشد");
    else {
      setEditingPhone(false);
      void refreshBookings();
      toast.success("ذخیره شد");
    }
  };

  const setPref = async (key: "sms_reminders" | "offers", value: boolean) => {
    const r = await updateProfile(user.name, user.id, undefined, { [key]: value });
    if (!r.success) toast.error(r.error || "ذخیره نشد");
  };

  return (
    <SalonGuard fallback={<div className="min-h-screen bg-background" aria-hidden="true" />}>
      <div className="mx-auto flex min-h-dvh w-full max-w-[var(--frame-max-w)] flex-col bg-background text-foreground">
        <header className="grid grid-cols-[44px_1fr_44px] items-center gap-1 px-3 pb-2 pt-3">
          <button type="button" className="iconbtn" onClick={() => router.push("/")} aria-label="بازگشت">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="h-m truncate text-center">پروفایل</h2>
          <span className="h-11 w-11" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain page-gutter pb-8 pt-2">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="row" style={{ gap: 28, margin: "16px 0 24px", justifyContent: "center" }}>
              <div>
                <div className="num" style={{ fontSize: 30, fontWeight: 100 }}>{toPersianDigits(done.length)}</div>
                <div className="t-s">نوبت انجام‌شده</div>
              </div>
              <Monogram name={user.name} size={64} />
              <div>
                <div className="num" style={{ fontSize: 30, fontWeight: 100 }}>{formatPrice(Math.round(spend / 1000))}</div>
                <div className="t-s">هزار تومان خرید</div>
              </div>
            </div>

            <label className="field">
              <span>نام</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="field" style={{ marginTop: 14 }}>
              <span>شماره موبایل</span>
              {editingPhone ? (
                <div className="row" style={{ gap: 8 }}>
                  <input
                    className="input ltr num"
                    style={{ textAlign: "center" }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="۰۹…"
                  />
                  <button type="button" className="btn pri sm" disabled={savingPhone} onClick={() => void savePhone()}>
                    ثبت
                  </button>
                </div>
              ) : (
                <button type="button" className="input ltr" style={{ display: "flex", alignItems: "center", color: "var(--mute)" }} onClick={() => { setPhone(user.phone); setEditingPhone(true); }}>
                  {displayDigits(user.phone)}
                </button>
              )}
            </div>

            <div className="list" style={{ marginTop: 18 }}>
              <div className="sum" style={{ alignItems: "center" }}>
                <span>یادآوری نوبت، یک روز قبل</span>
                <Switch checked={user.sms_reminders !== false} onCheckedChange={(v) => void setPref("sms_reminders", v)} label="یادآوری" />
              </div>
              <div className="sum" style={{ alignItems: "center" }}>
                <span>خبر کالکشن‌ها و پیشنهادها</span>
                <Switch checked={user.offers === true} onCheckedChange={(v) => void setPref("offers", v)} label="پیشنهادها" />
              </div>
            </div>

            <div className="row" style={{ marginTop: 22 }}>
              <button
                type="button"
                className="btn pri"
                disabled={name.trim() === user.name || name.trim().length < 2 || savingName}
                onClick={() => void saveName()}
              >
                {savingName ? "..." : "ذخیره"}
              </button>
              <button type="button" className="btn ghost" onClick={() => setConfirmLogout(true)}>
                <LogOut size={16} strokeWidth={1.4} />
                خروج
              </button>
            </div>
          </motion.div>
        </div>

        <Confirm
          open={confirmLogout}
          onClose={() => setConfirmLogout(false)}
          title="خارج شوید؟"
          body="نوبت‌های شما محفوظ می‌ماند."
          okLabel="خروج"
          onOk={() => {
            void logout();
            window.location.href = "/";
          }}
        />
      </div>
    </SalonGuard>
  );
}
