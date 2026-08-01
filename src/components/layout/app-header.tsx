"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toPersianDigits } from "@/lib/jalali";
import { useAuth } from "@/lib/auth-context";
import {
  Menu,
  X,
  ArrowRight,
  Phone,
  MapPin,
  Clock,
  Home,
  LogIn,
  LogOut,
  User,
} from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { useMenu } from "./menu-context";
import { haptic } from "@/lib/haptics";
import { ThemeToggle, ThemeModeMenu } from "@/components/ui/theme-toggle";

interface MenuItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface AppHeaderProps {
  showBack?: boolean;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  menuItems?: MenuItem[];
  menuFooter?: ReactNode;
}

export function AppHeader({
  showBack = false,
  title,
  subtitle,
  onBack,
  menuItems,
  menuFooter,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { salon } = useSalon();
  const { user, logout } = useAuth();
  const { open: menuOpen, openMenu, closeMenu } = useMenu();

  const isHome = pathname === "/";
  const isOwner = pathname.startsWith("/owner");

  // Build menu items based on auth state
  const defaultMenuItems: MenuItem[] = menuItems ?? (() => {
    const items: MenuItem[] = [
      { icon: <Home className="h-4 w-4" />, label: "صفحه اصلی", onClick: () => router.push("/") },
    ];

    if (user) {
      // Logged in as customer
      items.push({ icon: <User className="h-4 w-4" />, label: "پروفایل", onClick: () => router.push("/profile") });
      items.push({
        icon: <LogOut className="h-4 w-4" />,
        label: "خروج",
        destructive: true,
        onClick: async () => {
          await logout();
          window.location.href = "/";
        },
      });
    } else {
      // Not logged in
      items.push({ icon: <LogIn className="h-4 w-4" />, label: "ورود", onClick: () => router.push("/login") });
    }

    return items;
  })();

  // Close menu on route change
  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  return (
    <>
      <div
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{
        // Native safe-area: notch + Dynamic Island sit above the title row.
        // padding-top pushes content into the safe zone; the inner row keeps
        // its 52px height so visual rhythm stays identical on non-notch devices.
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="mx-auto max-w-lg px-4 h-[52px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && !isHome ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                haptic.tap();
                (onBack || (() => router.back()))();
              }}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : null}
            {title ? (
              <div>
                <h1 className="text-[15px] font-bold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-[11px] text-muted-foreground">{subtitle}</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-foreground">{salon.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                haptic.tap();
                openMenu();
              }}
              aria-label="منو"
              aria-expanded={menuOpen}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-md"
            onClick={closeMenu}
          />
          <div
            className="absolute top-0 right-0 h-full w-[280px] bg-background border-l border-border shadow-floating animate-slideUp flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="منوی جانبی"
          >
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[15px] font-bold text-foreground">{salon.name}</span>
                <Button variant="ghost" size="icon-sm" onClick={closeMenu}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 flex flex-col">
                {defaultMenuItems.map((item, i) => (
                  <div key={i}>
                    {item.icon === undefined && <Separator className="my-2" />}
                    <button
                      onClick={() => { item.onClick(); closeMenu(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-right transition-colors duration-150 ${
                        item.destructive ? "text-destructive hover:bg-destructive/10" : ""
                      }`}
                    >
                      <span className={item.destructive ? "text-destructive" : "text-muted-foreground"}>
                        {item.icon}
                      </span>
                      <span className="text-[14px]">{item.label}</span>
                    </button>
                  </div>
                ))}

                <Separator className="my-2" />

                <div className="mb-2">
                  <ThemeModeMenu onSelect={closeMenu} />
                </div>

                <Separator className="my-2" />

                {menuFooter ?? (
                  <>
                    <a
                      href={`tel:${salon.phone}`}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted text-right transition-colors duration-150"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[14px]" dir="ltr">{toPersianDigits(salon.phone)}</span>
                    </a>

                    <Separator className="my-2" />

                    <div className="px-3 py-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[12px] text-muted-foreground">{salon.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[12px] text-muted-foreground">
                          {salon.working_hours_text || "شنبه تا پنج شنبه . ۱۰ تا ۱۸"}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {!isOwner && (
                <div className="pt-2 border-t border-border">
                  <button
                    onClick={() => { router.push("/owner/login"); closeMenu(); }}
                    className="w-full flex items-center justify-center px-3 py-2.5 rounded-xl hover:bg-muted text-right transition-colors duration-150"
                  >
                    <span className="text-[13px] text-muted-foreground">ورود مدیر</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
