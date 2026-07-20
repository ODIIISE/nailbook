"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface User {
  id: string;
  phone: string;
  name: string;
  role: "customer" | "owner";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  checkPhone: (phone: string) => Promise<{ exists: boolean; hasPin?: boolean; role?: string }>;
  login: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  signup: (phone: string, pin: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "nailbook_user";

/** Synchronously read user from localStorage (avoids flash) */
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
  const [isLoading] = useState(false); // Already hydrated synchronously

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

  const checkPhone = useCallback(async (phone: string) => {
    try {
      const res = await fetch("/api/auth/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      return await res.json();
    } catch {
      return { exists: false };
    }
  }, []);

  const login = useCallback(async (phone: string, pin: string) => {
    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: "خطای سرور" };
    }
  }, []);

  const signup = useCallback(async (phone: string, pin: string, name: string) => {
    try {
      const res = await fetch("/api/auth/create-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, name }),
      });
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
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
    <AuthContext.Provider value={{ user, isLoading, checkPhone, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
