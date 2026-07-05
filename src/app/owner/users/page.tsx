"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Key, Lock, Unlock, X, UserCheck, AlertTriangle } from "lucide-react";
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

export default function OwnerUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetPin, setShowResetPin] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

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
    (u) =>
      u.phone.includes(search) ||
      u.name.includes(search)
  );

  const handleResetPin = async () => {
    if (!selectedUser) return;
    if (newPin.length !== 4) {
      setPinError("رمز باید ۴ رقمی باشد");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("رمزها مطابقت ندارند");
      return;
    }

    setIsResetting(true);
    setPinError("");
    try {
      const res = await fetch("/api/owner/reset-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUser.id, newPin: normalizeDigits(newPin) }),
      });
      const data = await res.json();
      if (data.success) {
        setShowResetPin(false);
        setSelectedUser(null);
        setNewPin("");
        setConfirmPin("");
        fetchUsers();
      } else {
        setPinError(data.error || "خطا در بروزرسانی");
      }
    } catch {
      setPinError("خطای سرور");
    }
    setIsResetting(false);
  };

  const formatPhone = (phone: string) => {
    return toPersianDigits(phone);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return toPersianDigits(d.toLocaleDateString("fa-IR"));
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">کاربران</h2>
        </div>
        <Badge variant="secondary">{toPersianDigits(users.length)} نفر</Badge>
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
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
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
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-bold text-foreground truncate">
                      {user.name || "بدون نام"}
                    </p>
                    {user.role === "owner" || user.role === "artist" ? (
                      <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
                        {user.role === "owner" ? "مدیر" : "هنرمند"}
                      </Badge>
                    ) : null}
                    {user.locked_until && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                        قفل
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-muted-foreground" dir="ltr">
                    {formatPhone(user.phone)}
                  </p>
                  <p className="text-[11px] text-muted-foreground/60">
                    عضویت: {formatDate(user.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowResetPin(true);
                      setNewPin("");
                      setConfirmPin("");
                      setPinError("");
                    }}
                    title="تغییر رمز"
                  >
                    <Key className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reset PIN Modal */}
      {showResetPin && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowResetPin(false)} />
          <div className="relative w-full max-w-sm bg-card rounded-3xl p-6 animate-scale shadow-elevated">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 text-foreground">تغییر رمز</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowResetPin(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="text-center mb-4">
              <p className="text-[13px] text-muted-foreground">
                رمز جدید برای
              </p>
              <p className="text-[15px] font-bold text-foreground">
                {selectedUser.name || formatPhone(selectedUser.phone)}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[13px] text-muted-foreground">رمز جدید (۴ رقمی)</label>
                <Input
                  type="text"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(normalizeDigits(e.target.value))}
                  placeholder="۱۲۳۴"
                  dir="ltr"
                  className="mt-1 text-center text-lg tracking-[0.3em]"
                />
              </div>
              <div>
                <label className="text-[13px] text-muted-foreground">تکرار رمز</label>
                <Input
                  type="text"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(normalizeDigits(e.target.value))}
                  placeholder="۱۲۳۴"
                  dir="ltr"
                  className="mt-1 text-center text-lg tracking-[0.3em]"
                />
              </div>

              {pinError && (
                <div className="flex items-center gap-2 text-[13px] text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{pinError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleResetPin}
                  disabled={isResetting || newPin.length !== 4}
                  className="flex-1"
                >
                  {isResetting ? "در حال ذخیره..." : "ذخیره رمز جدید"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowResetPin(false)}
                  className="flex-1"
                >
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
