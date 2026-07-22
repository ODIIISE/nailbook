"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Store, Users } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap page doesn't need auth
  const isBootstrap = pathname === "/admin/bootstrap";

  useEffect(() => {
    if (isBootstrap) {
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // Check if super-admin is logged in by trying to load salons
    fetch("/api/admin/salons")
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true);
        } else if (res.status === 401) {
          router.replace("/admin/bootstrap");
        }
      })
      .catch(() => {
        router.replace("/admin/bootstrap");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pathname, isBootstrap, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">در حال بارگذاری...</p>
      </div>
    );
  }

  if (isBootstrap) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
    { href: "/admin/salons", label: "سالن‌ها", icon: Store },
  ];

  const handleLogout = async () => {
    await fetch("/api/super-admin/logout", { method: "POST" });
    window.location.href = "/admin/bootstrap";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">پنل مدیریت</h1>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={pathname === item.href ? "default" : "ghost"}
                size="sm"
                onClick={() => router.push(item.href)}
                className="gap-2"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
