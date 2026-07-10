"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CalendarDays,
  User,
  LayoutGrid,
  Briefcase,
  Clock,
  Menu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMenu } from "./menu-context";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

interface AppNavbarProps {
  items?: NavItem[];
}

const defaultCustomerItems: NavItem[] = [
  { path: "/", icon: Home, label: "خانه" },
  { path: "/bookings", icon: CalendarDays, label: "نوبت‌ها" },
  { path: "/profile", icon: User, label: "پروفایل" },
];

const defaultOwnerItems: NavItem[] = [
  { path: "/owner", icon: LayoutGrid, label: "زمان‌بندی" },
  { path: "/owner/services", icon: Briefcase, label: "خدمات" },
  { path: "/owner/schedule", icon: Clock, label: "ساعات" },
];

export function AppNavbar({ items }: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { openMenu } = useMenu();

  const isOwner = pathname.startsWith("/owner");
  const navItems = items ?? (isOwner ? defaultOwnerItems : defaultCustomerItems);

  return (
    <div
        className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto max-w-lg flex items-stretch">
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = pathname === path;
            return (
              <button
                key={path}
                onClick={() => router.push(path)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-2 transition-all duration-180 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-[1.8]"}`} />
                <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-normal"}`}>
                  {label}
                </span>
              </button>
            );
          })}

          <button
            onClick={openMenu}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-2 transition-all duration-180 text-muted-foreground"
          >
            <Menu className="h-5 w-5 stroke-[1.8]" />
            <span className="text-[10px] leading-none font-normal">منو</span>
          </button>
        </div>
      </div>
  );
}
