"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Plus, Pencil, Trash2, X, UserCheck, AlertTriangle, Lock, Unlock, Key } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import { normalizeDigits } from "@/lib/digits";

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

type Modal = "add" | "edit" | "delete" | "reset-pin" | null;

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formConfirmPin, setFormConfirmPin] = useState("");
  const [formRole, setFormRole] = useState("customer");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/owner/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(
    (u) => u.phone.includes(search) || u.name.includes(search)
  );

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormPin("");
    setFormConfirmPin("");
    setFormRole("customer");
    setFormError("");
  };

  const openAdd = () => {
    resetForm();
    setModal("add");
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    setFormName(user.name);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormPin("");
    setFormConfirmPin("");
    setFormError("");
    setModal("edit");
  };

  const openDelete = (user: User) => {
    setSelectedUser(user);
    setModal("delete");
  };

  const openResetPin = (user: User) => {
    setSelectedUser(user);
    setFormPin("");
    setFormConfirmPin("");
    setFormError("");
    setModal("reset-pin");
  };

  const handleAdd = async () => {
    const phone = normalizeDigits(formPhone);
    if (phone.length < 10) { setFormError("شماره موبایل معتبر نیست"); return; }
    if (formPin.length !== 4) { setFormError("رمز باید ۴ رقمی باشد"); return; }

    setIsSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/owner/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name: formName, pin: formPin, role: formRole }),
      });
      const data = await res.json();
      if (data.success) {
        setModal(null);
        fetchUsers();
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
      };
      if (formPin.length === 4) {
        if (formPin !== formConfirmPin) { setFormError("رمزها مطابقت ندارند"); setIsSubmitting(false); return; }
        body.pin = formPin;
      }
      const res = await fetch("/api/owner/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setModal(null);
        fetchUsers();
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
        body: JSON.stringify({ userId: selectedUser.id }),
      });
      const data = await res.json();
      if (data.success) {
        setModal(null);
        fetchUsers();
      } else {
        setFormError(data.error || "خطا در حذف");
      }
    } catch {
      setFormError("خطای سرور");
    }
    setIsSubmitting(false);
  };

  const handleResetPin = async () => {
    if (!selectedUser) return;
    const pin = normalizeDigits(formPin);
    const confirm = normalizeDigits(formConfirmPin);
    if (pin.length !== 4) { setFormError("رمز باید ۴ رقمی باشد"); return; }
    if (pin !== confirm) { setFormError("رمزها مطابقت ندارند"); return; }

    setIsSubmitting(true);
    setFormError("");
    try {
      const res = await fetch("/api/owner/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, pin }),
      });
      const data = await res.json();
      if (data.success) {
        setModal(null);
        fetchUsers();
      } else {
        setFormError(data.error || "خطا در بروزرسانی رمز");
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
        body: JSON.stringify({ userId: user.id, locked: !user.locked_until }),
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch {}
  };

  const formatPhone = (p: string) => toPersianDigits(p);
  const formatDate = (d: string) => {
    if (!d) return "نامعلوم";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "نامعلوم";
    return toPersianDigits(date.toLocaleDateString("fa-IR"));
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">کاربران</h2>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 ml-1" />
          افزودن
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو بر اساس نام یا شماره..."
          className="pr-10"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">کاربری یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="p-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-foreground truncate">{user.name || "بدون نام"}</p>
                    {user.role === "owner" && (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
                        مدیر
                      </Badge>
                    )}
                    {user.locked_until && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">قفل</Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground" dir="ltr">{formatPhone(user.phone)}</p>
                  <p className="text-[11px] text-muted-foreground/60">عضویت: {formatDate(user.created_at)}</p>
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => handleToggleBlock(user)} title={user.locked_until ? "رفع قفل" : "قفل"}>
                    {user.locked_until ? <Unlock className="h-4 w-4 text-amber-500" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openResetPin(user)} title="تغییر رمز">
                    <Key className="h-4 w-4 text-primary" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(user)} title="ویرایش">
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openDelete(user)} title="حذف">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Add / Edit Modal ─── */}
      {(modal === "add" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-sm bg-card rounded-3xl p-6 animate-scale shadow-elevated max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-foreground">{modal === "add" ? "کاربر جدید" : "ویرایش کاربر"}</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setModal(null)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[13px] text-muted-foreground">نام</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="نام و نام خانوادگی" className="mt-1" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">شماره موبایل</label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="09121234567" dir="ltr" className="mt-1 text-left" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">نقش</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-[14px]"
                >
                  <option value="customer">مشتری</option>
                  <option value="owner">مدیر</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">{modal === "add" ? "رمز (۴ رقمی)" : "رمز جدید (اختیاری)"}</label>
                <Input type="text" maxLength={4} value={formPin} onChange={(e) => setFormPin(normalizeDigits(e.target.value))} placeholder="۱۲۳۴" dir="ltr" className="mt-1 text-center tracking-[0.3em]" />
              </div>
              {modal === "edit" && formPin.length === 4 && (
                <div>
                  <label className="text-[13px] text-muted-foreground">تکرار رمز</label>
                  <Input type="text" maxLength={4} value={formConfirmPin} onChange={(e) => setFormConfirmPin(normalizeDigits(e.target.value))} placeholder="۱۲۳۴" dir="ltr" className="mt-1 text-center tracking-[0.3em]" />
                </div>
              )}
              {formError && (
                <div className="flex items-center gap-2 text-[13px] text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" /><span>{formError}</span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button onClick={modal === "add" ? handleAdd : handleEdit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "در حال ذخیره..." : modal === "add" ? "ایجاد کاربر" : "ذخیره"}
                </Button>
                <Button variant="outline" onClick={() => setModal(null)} className="flex-1">انصراف</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation ─── */}
      {modal === "delete" && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-sm bg-card rounded-3xl p-6 animate-scale shadow-elevated">
            <div className="text-center mb-4">
              <div className="h-14 w-14 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-h3 text-foreground">حذف کاربر</h3>
              <p className="text-[13px] text-muted-foreground mt-1">
                آیا از حذف <strong>{selectedUser.name || formatPhone(selectedUser.phone)}</strong> مطمئنید؟
              </p>
              <p className="text-[12px] text-destructive mt-2">این عمل قابل بازگشت نیست</p>
            </div>
            {formError && <p className="text-[13px] text-destructive text-center mb-3">{formError}</p>}
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "در حال حذف..." : "حذف"}
              </Button>
              <Button variant="outline" onClick={() => setModal(null)} className="flex-1">انصراف</Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reset PIN Modal ─── */}
      {modal === "reset-pin" && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-sm bg-card rounded-3xl p-6 animate-scale shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-foreground">تغییر رمز</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setModal(null)}><X className="h-5 w-5" /></Button>
            </div>
            <p className="text-center text-[13px] text-muted-foreground mb-4">
              رمز جدید برای <strong>{selectedUser.name || formatPhone(selectedUser.phone)}</strong>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[13px] text-muted-foreground">رمز جدید (۴ رقمی)</label>
                <Input type="text" maxLength={4} value={formPin} onChange={(e) => setFormPin(normalizeDigits(e.target.value))} placeholder="۱۲۳۴" dir="ltr" className="mt-1 text-center tracking-[0.3em]" />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">تکرار رمز</label>
                <Input type="text" maxLength={4} value={formConfirmPin} onChange={(e) => setFormConfirmPin(normalizeDigits(e.target.value))} placeholder="۱۲۳۴" dir="ltr" className="mt-1 text-center tracking-[0.3em]" />
              </div>
              {formError && (
                <div className="flex items-center gap-2 text-[13px] text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" /><span>{formError}</span>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleResetPin} disabled={isSubmitting || formPin.length !== 4} className="flex-1">
                  {isSubmitting ? "در حال ذخیره..." : "ذخیره رمز"}
                </Button>
                <Button variant="outline" onClick={() => setModal(null)} className="flex-1">انصراف</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
