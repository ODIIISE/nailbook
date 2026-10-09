"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { normalizeDigits, isValidIranianPhone } from "@/lib/digits";
import { can as canPermission, type StaffPermission } from "@/lib/staff-permissions";

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  role: "customer" | "owner";
  roles: string[];
  sms_reminders?: boolean;
  offers?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, code: string) => Promise<{ success: boolean; error?: string; user?: AuthUser }>;
  updateProfile: (name: string, userId?: string, phone?: string, prefs?: { sms_reminders?: boolean; offers?: boolean }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isOwner: boolean;
  hasRole: (role: "customer" | "owner") => boolean;
  /** Staff permission check against the user's roles (UI hiding only). */
  hasPermission: (permission: StaffPermission) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "nailbook_user";

/** Synchronously read user from localStorage (avoids flash, validated server-side below) */
function getInitialUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize synchronously from localStorage — no flash
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);
  const [isLoading, setIsLoading] = useState(true);
  const validatedRef = useRef(false);

  // Server-side session validation on mount
  useEffect(() => {
    if (validatedRef.current) return;
    validatedRef.current = true;

    async function validateSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
          } else {
            setUser(null);
            localStorage.removeItem(STORAGE_KEY);
          }
        } else {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // Network error — keep localStorage value as optimistic cache
      } finally {
        setIsLoading(false);
      }
    }
    void validateSession();
  }, []);

  // Sync auth state across tabs via storage event
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        try {
          setUser(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setUser(null);
        }
      }
    };
    // Same-tab flows that write the storage key directly (owner login primes
    // the cache before the client-side redirect) announce themselves with
    // this event — same-tab writes never fire a `storage` event.
    const handleAuthSync = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setUser(raw ? JSON.parse(raw) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("nailbook:auth-sync", handleAuthSync);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("nailbook:auth-sync", handleAuthSync);
    };
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok) return { success: true };
      return { success: false, error: data.error || "خطا در ارسال کد" };
    } catch {
      // Network failure (offline / stalled connection) — "خطای سرور" blamed
      // the salon's server for a dead phone connection; name the network so
      // the customer can act (P5).
      return { success: false, error: "ارسال کد انجام نشد — اتصال اینترنت را بررسی کنید" };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: "خطا در بررسی کد — اتصال اینترنت را بررسی کنید" };
    }
  }, []);

  const updateProfile = useCallback(async (name: string, userId?: string, phone?: string, prefs?: { sms_reminders?: boolean; offers?: boolean }) => {
    const trimmed = name.trim();
    const targetUserId = userId ?? user?.id;
    if (!trimmed) return { success: false, error: "نام الزامی است" };
    if (!targetUserId) return { success: false, error: "ابتدا شماره را تأیید کنید" };
    const cleanPhone = phone === undefined ? undefined : normalizeDigits(phone);
    if (cleanPhone !== undefined && !isValidIranianPhone(cleanPhone)) {
      return { success: false, error: "شماره موبایل نامعتبر است" };
    }

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          name: trimmed,
          ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
          ...(prefs?.sms_reminders !== undefined ? { sms_reminders: prefs.sms_reminders } : {}),
          ...(prefs?.offers !== undefined ? { offers: prefs.offers } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, error: data.error || "ذخیره تغییرات انجام نشد" };
      setUser((currentUser) => {
        if (!currentUser || currentUser.id !== targetUserId) return currentUser;
        const nextUser = {
          ...currentUser,
          name: trimmed,
          ...(cleanPhone !== undefined ? { phone: cleanPhone } : {}),
          ...(prefs?.sms_reminders !== undefined ? { sms_reminders: prefs.sms_reminders } : {}),
          ...(prefs?.offers !== undefined ? { offers: prefs.offers } : {}),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        return nextUser;
      });
      return { success: true };
    } catch {
      return { success: false, error: "ذخیره تغییرات انجام نشد" };
    }
  }, [user]);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
  }, []);

  const isOwner = Boolean(user?.roles?.includes("owner"));
  const hasRole = useCallback((role: "customer" | "owner") => Boolean(user?.roles?.includes(role)), [user]);
  const hasPermission = useCallback(
    (permission: StaffPermission) => canPermission(user?.roles, permission),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, sendOtp, verifyOtp, updateProfile, logout, isOwner, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
