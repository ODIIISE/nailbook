"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Store, Download, Database, Shield } from "lucide-react";

interface SuperAdminInfo {
  id: string;
  phone: string;
  name: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SuperAdminInfo | null>(null);
  const isSpecialPage = pathname === "/admin/bootstrap" || pathname === "/admin/migrate" || pathname === "/admin/login";
  const [isLoading, setIsLoading] = useState(!isSpecialPage);

  // Add dark class to html element
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (isSpecialPage) {
      return;
    }

    fetch("/api/super-admin/me")
      .then((res) => {
        if (res.ok) {
          return res.json().then((data) => setUser(data));
        } else if (res.status === 401) {
          window.location.href = "/admin/login";
        } else {
          throw new Error("Failed to load admin info");
        }
      })
      .catch(() => {
        window.location.href = "/admin/login";
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pathname, isSpecialPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  if (isSpecialPage) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/admin/salons", label: "سالن‌ها", icon: Store },
    { href: "/admin/export", label: "خروجی", icon: Download },
    { href: "/admin/migrate", label: "مایگریشن", icon: Database },
  ];

  const handleLogout = async () => {
    await fetch("/api/super-admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-wider uppercase">پنل مدیریت</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.href)}
                className="gap-2 rounded"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
            <div className="h-6 w-px bg-border mx-1" />
            <span className="text-sm text-muted-foreground">{user.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive rounded">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
