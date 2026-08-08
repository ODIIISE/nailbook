"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Check, LogOut, Pencil, Phone, User, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { displayDigits } from "@/lib/digits";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const goBack = () => {
    window.dispatchEvent(new Event("nailbook:back"));
    router.push("/");
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

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
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

        <div className="qbf-form-card" style={{ padding: 0 }}>
          <p className="qbf-form-t" style={{ padding: "16px 16px 4px" }}>مشخصات شما</p>

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
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button type="button" className="qbf-rev-edit" onClick={saveEdit} disabled={saving}>
                  {saving ? "…" : <Check className="h-4 w-4" aria-hidden="true" />}
                </button>
                <button type="button" className="qbf-rev-edit" onClick={cancelEdit} aria-label="انصراف">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button type="button" className="qbf-rev-edit" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                ویرایش
              </button>
            )}
          </div>

          <div className="qbp-row">
            <span className="qbf-rev-ic"><Phone className="h-4 w-4" aria-hidden="true" /></span>
            <div className="qbp-row-meta">
              <small>شماره موبایل</small>
              <b dir="ltr">{displayDigits(user.phone)}</b>
              <span className="qbp-row-note">شماره موبایل هویت ورود شماست؛ برای تغییر آن با سالن در تماس باشید.</span>
            </div>
          </div>
        </div>

        <button type="button" className="qbp-logout" onClick={handleLogout}>
          <LogOut aria-hidden="true" />
          خروج از حساب
        </button>
      </div>
    </div>
  );
}
