"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Store, Download } from "lucide-react";

interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap and migrate pages don't need auth
  const isSpecialPage = pathname === "/admin/bootstrap" || pathname === "/admin/migrate";

  // Add dark class to html element
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (isSpecialPage) {
      setIsLoading(false);
      return;
    }

    // Check Google session by trying to load salons
    fetch("/api/admin/salons")
      .then((res) => {
        if (res.ok) {
          // Extract user info from response or use a separate endpoint
          setIsAuthenticated(true);
          setUser({ email: "mehrdad.rastadfar@gmail.com", name: "Mehrdad", picture: "" });
        } else if (res.status === 401) {
          // Not logged in — redirect to Google auth
          window.location.href = "/api/auth/google";
        }
      })
      .catch(() => {
        window.location.href = "/api/auth/google";
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pathname, isSpecialPage, router]);

  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/admin/salons", label: "سالن‌ها", icon: Store },
    { href: "/admin/export", label: "خروجی", icon: Download },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/google/logout", { method: "POST" });
    window.location.href = "/admin";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-sm">پنل مدیریت</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.href)}
                className="gap-2 rounded-full"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
            <div className="h-6 w-px bg-border mx-1" />
            {user?.picture && (
              <img src={user.picture} alt="" className="h-7 w-7 rounded-full" />
            )}
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive rounded-full">
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
