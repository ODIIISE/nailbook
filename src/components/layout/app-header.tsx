"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toPersianDigits } from "@/lib/jalali";
import {
  Menu,
  X,
  ArrowRight,
  Phone,
  AtSign,
  MapPin,
  Clock,
} from "lucide-react";
import { useSalon } from "@/lib/salon-context";
import { useMenu } from "./menu-context";

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
  const { open: menuOpen, openMenu, closeMenu } = useMenu();

  const isHome = pathname === "/";

  const defaultMenuItems: MenuItem[] = menuItems ?? [
    { icon: <span className="text-[14px]">🏠</span>, label: "صفحه اصلی", onClick: () => router.push("/") },
  ];

  // Close menu on route change
  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  return (
    <>
      <div className="sticky top-0 z-30 bg-background border-b border-border h-[52px]">
        <div className="mx-auto max-w-lg px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && !isHome ? (
              <Button variant="ghost" size="icon-sm" onClick={onBack || (() => router.back())}>
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
          <Button variant="ghost" size="icon-sm" onClick={openMenu}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/15 backdrop-blur-sm"
            onClick={closeMenu}
          />
          <div className="absolute top-0 right-0 h-full w-[280px] glass-strong rounded-l-[24px] shadow-floating animate-slideUp">
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <span className="text-[15px] font-bold text-foreground">{salon.name}</span>
                <Button variant="ghost" size="icon-sm" onClick={closeMenu}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-0.5">
                {defaultMenuItems.map((item, i) => (
                  <div key={i}>
                    {item.icon === undefined && <Separator className="my-2 bg-black/5" />}
                    <button
                      onClick={() => { item.onClick(); closeMenu(); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-white/40 text-right transition-colors duration-150 ${
                        item.destructive ? "text-red-500 hover:bg-red-500/10" : ""
                      }`}
                    >
                      <span className={item.destructive ? "text-red-500" : "text-muted-foreground"}>
                        {item.icon}
                      </span>
                      <span className="text-[14px]">{item.label}</span>
                    </button>
                  </div>
                ))}

                <Separator className="my-2 bg-black/5" />

                {menuFooter ?? (
                  <>
                    <a
                      href={`tel:${salon.phone}`}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-white/40 text-right transition-colors duration-150"
                    >
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[14px]" dir="ltr">{toPersianDigits(salon.phone)}</span>
                    </a>

                    <a
                      href="https://instagram.com/forehandnailstudio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] hover:bg-white/40 text-right transition-colors duration-150"
                    >
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[14px]">اینستاگرام</span>
                    </a>

                    <Separator className="my-2 bg-black/5" />

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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
