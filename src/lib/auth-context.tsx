"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";

interface User {
  id: string;
  phone: string;
  name: string;
  role: "customer" | "owner";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sendOtp: (phone: string, roleContext?: "customer" | "owner") => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, code: string, options?: { roleContext?: "customer" | "owner" }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "nailbook_user";

/** Synchronously read user from localStorage (avoids flash, validated server-side below) */
function getInitialUser(): User | null {
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
  const [user, setUser] = useState<User | null>(getInitialUser);
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
    validateSession();
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
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const sendOtp = useCallback(async (phone: string, roleContext: "customer" | "owner" = "customer") => {
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, roleContext }),
      });
      const data = await res.json();
      if (res.ok) return { success: true };
      return { success: false, error: data.error || "خطا در ارسال کد" };
    } catch {
      return { success: false, error: "خطای سرور" };
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string, options: { roleContext?: "customer" | "owner" } = {}) => {
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          roleContext: options.roleContext || "customer",
        }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: "خطای سرور" };
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
