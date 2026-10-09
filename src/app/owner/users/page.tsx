"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Users, Search, Plus, Pencil, Trash2, AlertTriangle, Lock, Unlock, ShieldCheck } from "lucide-react";
import { Monogram } from "@/components/ui/nail";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toPersianDigits, gregorianToJalali, formatJalaliDateShort } from "@/lib/jalali";
import { parseGregorianDateKey } from "@/lib/time";
import { normalizeDigits } from "@/lib/digits";
import { handleAuthExpiry } from "@/lib/db/data";
import { useSalon } from "@/lib/salon-context";

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
  specialty?: string;
  work_days?: number[];
  service_ids?: string[];
  sms_reminders?: boolean;
  offers?: boolean;
  note?: string;
}

/** Iran-week day order matching work_days indexes (0 = Saturday). */
const WEEKDAY_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

const ROLE_LABELS: Record<string, string> = {
  owner: "مدیر",
  manager: "مدیر داخلی",
  artist: "هنرمند",
  customer: "مشتری",
};

type Modal = "add" | "edit" | "delete" | null;

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "manager" | "artist" | "customer">("all");
  const { bookings, services } = useSalon();
  const [modal, setModal] = useState<Modal>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const [formRole, setFormRole] = useState("customer");
  const [formSpecialty, setFormSpecialty] = useState("");
  const [formWorkDays, setFormWorkDays] = useState<number[]>([]);
  const [formServiceIds, setFormServiceIds] = useState<string[]>([]);
  const [formSms, setFormSms] = useState(true);
  const [formOffers, setFormOffers] = useState(false);
  const [formNote, setFormNote] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/users", { credentials: "include" });
      if (handleAuthExpiry(res)) return;
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
      toast.error("خطا در دریافت کاربران");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetching the users list on mount is the standard data-loading pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUsers();
  }, [fetchUsers]);

  // Normalize Persian/Arabic digits so searching "۰۹۱۲" matches stored "0912".
  const normalizedSearch = normalizeDigits(search);
  const roleCounts = {
    all: users.length,
    owner: users.filter((u) => u.role === "owner").length,
    manager: users.filter((u) => u.role === "manager").length,
    artist: users.filter((u) => u.role === "artist").length,
    customer: users.filter((u) => u.role !== "owner" && u.role !== "manager" && u.role !== "artist").length,
  };
  const inRoleBucket = (u: User) => {
    if (roleFilter === "all") return true;
    // Legacy or unknown role strings still land in the customer bucket.
    if (roleFilter === "customer") return u.role !== "owner" && u.role !== "manager" && u.role !== "artist";
    return u.role === roleFilter;
  };
  const filteredUsers = users.filter(
    (u) =>
      inRoleBucket(u) &&
      (u.phone.includes(normalizedSearch) || u.name.includes(search))
  );

  /* Per-user visit stats from real bookings (v-2 directory columns). */
  const userStats = (u: User) => {
    const mine = bookings.filter((b) => b.user_id === u.id || b.customer_phone === u.phone);
    const completed = mine.filter((b) => b.status === "completed").length;
    const last = mine
      .map((b) => b.date_gregorian.split("T")[0])
      .sort()
      .at(-1);
    return { completed, last };
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormRole("customer");
    setFormSpecialty("");
    setFormWorkDays([]);
    setFormServiceIds([]);
    setFormSms(true);
    setFormOffers(false);
    setFormNote("");
    setFormError("");
  };

  const openAdd = (role: "customer" | "owner" = "customer") => {
    resetForm();
    setFormRole(role);
    setModal("add");
  };

  const toggleWorkDay = (day: number) => {
    setFormWorkDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  };

  const toggleServiceId = (id: string) => {
    setFormServiceIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const activeServices = services.filter((s) => s.is_active);

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormSpecialty(user.specialty || "");
    setFormWorkDays(Array.isArray(user.work_days) ? user.work_days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : []);
    setFormServiceIds(Array.isArray(user.service_ids) ? user.service_ids.filter((id) => typeof id === "string") : []);
    setFormSms(user.sms_reminders !== false);
    setFormOffers(user.offers === true);
    setFormNote(user.note || "");
    setFormError("");
    setModal("edit");
  };

  const openDelete = (user: User) => {
    setSelectedUser(user);
    setModal("delete");
  };



  /** Profile payload shared by add + edit (artist fields, prefs, note). */
  const profilePayload = () => ({
    specialty: formSpecialty.trim(),
    work_days: formWorkDays,
    service_ids: formServiceIds,
    sms_reminders: formSms,
    offers: formOffers,
    note: formNote.trim(),
  });

  const handleAdd = async () => {
    const phone = normalizeDigits(formPhone);
    if (phone.length < 10) { setFormError("شماره موبایل معتبر نیست"); return; }
    setIsSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/owner/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, name: formName, role: formRole, ...profilePayload() }),
      });
      const data = await res.json();
      if (data.success) {
        setModal(null);
        void fetchUsers();
      } else {
        setFormError(data.error || "خطا در ایجاد کاربر");
      }
    } catch {
      setFormError("خطای سرور");
    }
    setIsSubmitting(false);
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    const phone = normalizeDigits(formPhone);
    if (phone.length < 10) { setFormError("شماره موبایل معتبر نیست"); return; }

    setIsSubmitting(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        userId: selectedUser.id,
        phone,
        name: formName,
        role: formRole,
        ...profilePayload(),
      };

      const res = await fetch("/api/owner/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setModal(null);
        void fetchUsers();
      } else {
        setFormError(data.error || "خطا در بروزرسانی");
      }
    } catch {
      setFormError("خطای سرور");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owner/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: selectedUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        setModal(null);
        void fetchUsers();
      } else {
        setFormError(data.error || "خطا در حذف");
      }
    } catch {
      setFormError("خطای سرور");
    }
    setIsSubmitting(false);
  };



  const handleToggleBlock = async (user: User) => {
    try {
      const res = await fetch("/api/owner/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: user.id, locked: !user.locked_until }),
      });
      if (handleAuthExpiry(res)) return;
      const data = await res.json();
      if (data.success) {
        void fetchUsers();
      } else {
        // The block icon previously did nothing on failure — the owner kept
        // tapping a control that never worked (expired session, self-lock).
        toast.error(data.error || "خطا در تغییر وضعیت کاربر");
      }
    } catch {
      toast.error("خطا در تغییر وضعیت کاربر");
    }
  };

  const formatPhone = (p: string) => toPersianDigits(p);
  const formatLastVisit = (key: string) => {
    const j = gregorianToJalali(parseGregorianDateKey(key));
    return formatJalaliDateShort(j.jy, j.jm, j.jd);
  };

  return (
    <div className="page-gutter space-y-4 pb-8 pt-2">
      {/* Header */}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="h-m">کاربران</h2>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn gl sm" onClick={() => openAdd("owner")}>
            <ShieldCheck size={16} strokeWidth={1.5} />
            مدیر جدید
          </button>
          <button type="button" className="btn pri sm" onClick={() => openAdd("customer")}>
            <Plus size={16} strokeWidth={1.6} />
            مشتری جدید
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={17} strokeWidth={1.5} aria-hidden="true" style={{ position: "absolute", insetInlineStart: 16, top: "50%", translate: "0 -50%", color: "var(--faint)" }} />
        <input
          className="input"
          style={{ paddingInlineStart: 42 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو بر اساس نام یا شماره..."
          aria-label="جستجوی کاربر"
        />
      </div>

      {/* Role filter */}
      <div className="row" style={{ gap: 8, overflowX: "auto" }} role="group" aria-label="فیلتر نقش">
        {([["all", "همه"], ["owner", "مدیر"], ["manager", "داخلی"], ["artist", "هنرمند"], ["customer", "مشتری"]] as const).map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-pressed={roleFilter === v}
            onClick={() => setRoleFilter(v)}
            className={`chip num${roleFilter === v ? " on" : ""}`}
            style={{ flex: "none" }}
          >
            {label} {toPersianDigits(roleCounts[v])}
          </button>
        ))}
      </div>

      {/* Users List */}
      {loading ? (
        <div className="panel center">در حال بارگذاری...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="panel center">
          <Users size={30} strokeWidth={1.2} aria-hidden="true" style={{ margin: "0 auto 10px", color: "var(--faint)" }} />
          <p className="mute">کاربری یافت نشد</p>
        </div>
      ) : (
        <div className="list">
          {filteredUsers.map((user) => {
            const stats = userStats(user);
            return (
            <div key={user.id} className="row" style={{ padding: "12px 0", alignItems: "flex-start" }}>
              <Monogram name={user.name} size={44} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8 }}>
                  <p style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name || "بدون نام"}</p>
                  {user.role !== "customer" && (
                    <span className="badge">
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  )}
                  {user.locked_until && (
                    <span className="badge" style={{ color: "var(--wine-hi)", borderColor: "#8c2a3a66" }}>قفل</span>
                  )}
                </div>
                <p className="t-s ltr num">{formatPhone(user.phone)}</p>
                <p className="t-s num">
                  {toPersianDigits(stats.completed)} نوبت انجام‌شده{stats.last ? ` · آخرین مراجعه ${formatLastVisit(stats.last)}` : ""}
                </p>
              </div>
              {user.role !== "owner" && (
                <div className="row" style={{ gap: 0, flex: "none" }}>
                  <button type="button" className="iconbtn bare" onClick={() => handleToggleBlock(user)} title={user.locked_until ? "رفع قفل" : "قفل"} aria-label={user.locked_until ? "رفع قفل" : "قفل"}>
                    {user.locked_until ? <Unlock size={17} strokeWidth={1.5} style={{ color: "var(--gold)" }} /> : <Lock size={17} strokeWidth={1.5} />}
                  </button>
                  <button type="button" className="iconbtn bare" onClick={() => openEdit(user)} title="ویرایش" aria-label="ویرایش">
                    <Pencil size={17} strokeWidth={1.5} />
                  </button>
                  <button type="button" className="iconbtn bare" onClick={() => openDelete(user)} title="حذف" aria-label="حذف">
                    <Trash2 size={17} strokeWidth={1.5} style={{ color: "var(--wine-hi)" }} />
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* ─── Add / Edit Sheet ─── */}
      <BottomSheet
        open={modal === "add" || modal === "edit"}
        onClose={() => setModal(null)}
        title={modal === "add" ? (formRole === "owner" ? "ایجاد مدیر جدید" : "ایجاد مشتری جدید") : "ویرایش کاربر"}
      >
          <div style={{ display: "grid", gap: 12 }}>
            <label className="field">
              <span>نام</span>
              <input className="input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="نام و نام خانوادگی" />
            </label>
            <label className="field">
              <span>شماره موبایل</span>
              <input className="input ltr" style={{ textAlign: "left" }} value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="09121234567" />
            </label>
            {(modal === "add" || selectedUser?.role !== "owner") && (
              <div className="field">
                <span>نقش</span>
                <Select value={formRole} onValueChange={(val) => setFormRole(val as string)}>
                  <SelectTrigger className="input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">مشتری</SelectItem>
                    <SelectItem value="artist">هنرمند</SelectItem>
                    <SelectItem value="manager">مدیر داخلی</SelectItem>
                    <SelectItem value="owner">مدیر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {formRole === "artist" && (
              <>
                <label className="field">
                  <span>تخصص</span>
                  <input className="input" value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)} placeholder="مثلاً کاشت، طراحی" maxLength={100} />
                </label>
                <div>
                  <span className="t-s">روزهای کاری</span>
                  <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 8 }} role="group" aria-label="روزهای کاری">
                    {WEEKDAY_LABELS.map((label, day) => (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={formWorkDays.includes(day)}
                        onClick={() => toggleWorkDay(day)}
                        className={`chip${formWorkDays.includes(day) ? " on" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {activeServices.length > 0 && (
                  <div>
                    <span className="t-s">خدمات قابل ارائه</span>
                    <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                      {activeServices.map((s) => (
                        <label key={s.id} className="row" style={{ gap: 10, minHeight: 44, fontSize: 15 }}>
                          <input
                            type="checkbox"
                            checked={formServiceIds.includes(s.id)}
                            onChange={() => toggleServiceId(s.id)}
                            style={{ width: 20, height: 20, accentColor: "var(--pearl)" }}
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="panel" style={{ display: "grid", gap: 4 }}>
              <label className="row" style={{ justifyContent: "space-between", minHeight: 44, fontSize: 15 }}>
                یادآوری پیامکی
                <Switch checked={formSms} onCheckedChange={setFormSms} />
              </label>
              <label className="row" style={{ justifyContent: "space-between", minHeight: 44, fontSize: 15 }}>
                پیشنهادها و تخفیف‌ها
                <Switch checked={formOffers} onCheckedChange={setFormOffers} />
              </label>
            </div>
            <label className="field">
              <span>یادداشت داخلی</span>
              <input className="input" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="فقط برای همکاران نمایش داده می‌شود" maxLength={500} />
            </label>
            {modal === "add" && formRole === "owner" && (
              <p className="t-s panel">
                این شماره می‌تواند پس از دریافت کد پیامکی وارد پنل مدیر شود.
              </p>
            )}
            {formError && (
              <p className="t-s row" style={{ gap: 8, color: "var(--wine-hi)" }} role="alert">
                <AlertTriangle size={16} strokeWidth={1.5} aria-hidden="true" style={{ flex: "none" }} /><span>{formError}</span>
              </p>
            )}
            <div className="row" style={{ gap: 10, marginTop: 4 }}>
              <button type="button" className="btn pri" style={{ flex: 1 }} onClick={modal === "add" ? handleAdd : handleEdit} disabled={isSubmitting}>
                {isSubmitting ? "در حال ذخیره..." : modal === "add" ? (formRole === "owner" ? "ایجاد مدیر" : "ایجاد مشتری") : "ذخیره"}
              </button>
              <button type="button" className="btn gl" style={{ flex: 1 }} onClick={() => setModal(null)}>انصراف</button>
            </div>
          </div>
      </BottomSheet>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={modal === "delete"} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف <strong>{selectedUser?.name || (selectedUser ? formatPhone(selectedUser.phone) : "")}</strong> مطمئنید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-small text-destructive text-center -mt-2">این عمل قابل بازگشت نیست</p>
          {formError && <p className="text-caption text-destructive text-center">{formError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </div>
  );
}
