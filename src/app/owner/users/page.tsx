"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, Plus, Pencil, Trash2, UserCheck, AlertTriangle, Lock, Unlock, Key } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
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
      const res = await fetch("/api/owner/users", { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
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
        credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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
      const res = await fetch("/api/owner/users/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: selectedUser.id,
          pin,
        }),
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
        credentials: "include",
        body: JSON.stringify({ userId: user.id, locked: !user.locked_until }),
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch (e) {
      console.error("Failed to toggle block:", e);
    }
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
          <Plus className="h-4 w-4 ms-1" />
          افزودن
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو بر اساس نام یا شماره..."
          className="ps-10"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
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
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-muted-foreground/60">عضویت: {formatDate(user.created_at)}</p>
                  </div>
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

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={modal === "add" || modal === "edit"} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{modal === "add" ? "کاربر جدید" : "ویرایش کاربر"}</DialogTitle>
          </DialogHeader>
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
              <Select value={formRole} onValueChange={(val) => setFormRole(val as string)}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">مشتری</SelectItem>
                  <SelectItem value="owner">مدیر</SelectItem>
                </SelectContent>
              </Select>
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
              <Button size="lg" onClick={modal === "add" ? handleAdd : handleEdit} disabled={isSubmitting} className="flex-1">
                {isSubmitting ? "در حال ذخیره..." : modal === "add" ? "ایجاد کاربر" : "ذخیره"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setModal(null)} className="flex-1">انصراف</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={modal === "delete"} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف کاربر</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف <strong>{selectedUser?.name || (selectedUser ? formatPhone(selectedUser.phone) : "")}</strong> مطمئنید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-[12px] text-destructive text-center -mt-2">این عمل قابل بازگشت نیست</p>
          {formError && <p className="text-[13px] text-destructive text-center">{formError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Reset PIN Dialog ─── */}
      <Dialog open={modal === "reset-pin"} onOpenChange={(open) => { if (!open) setModal(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تغییر رمز</DialogTitle>
          </DialogHeader>
          <p className="text-center text-[13px] text-muted-foreground">
            رمز جدید برای <strong>{selectedUser?.name || (selectedUser ? formatPhone(selectedUser.phone) : "")}</strong>
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
              <Button size="lg" onClick={handleResetPin} disabled={isSubmitting || formPin.length !== 4} className="flex-1">
                {isSubmitting ? "در حال ذخیره..." : "ذخیره رمز"}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setModal(null)} className="flex-1">انصراف</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
