"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMenu } from "./menu-context";
import { haptic } from "@/lib/haptics";

// Customer icons — outline (default) + solid (active)
import { HomeIcon as HomeOutline } from "@heroicons/react/24/outline";
import { HomeIcon as HomeSolid } from "@heroicons/react/24/solid";
import { CalendarDaysIcon as CalendarOutline } from "@heroicons/react/24/outline";
import { CalendarDaysIcon as CalendarSolid } from "@heroicons/react/24/solid";
import { UserIcon as UserOutline } from "@heroicons/react/24/outline";
import { UserIcon as UserSolid } from "@heroicons/react/24/solid";

// Owner icons — outline (default) + solid (active)
import { Squares2X2Icon as GridOutline } from "@heroicons/react/24/outline";
import { Squares2X2Icon as GridSolid } from "@heroicons/react/24/solid";
import { ClockIcon as ClockOutline } from "@heroicons/react/24/outline";
import { ClockIcon as ClockSolid } from "@heroicons/react/24/solid";
import { ChartBarIcon as ChartOutline } from "@heroicons/react/24/outline";
import { ChartBarIcon as ChartSolid } from "@heroicons/react/24/solid";

// Menu icon (no active state)
import { Bars3Icon } from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  activeIcon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
}

interface AppNavbarProps {
  items?: NavItem[];
}

const defaultCustomerItems: NavItem[] = [
  { path: "/", icon: HomeOutline, activeIcon: HomeSolid, label: "خانه" },
  { path: "/bookings", icon: CalendarOutline, activeIcon: CalendarSolid, label: "نوبت‌ها" },
  { path: "/profile", icon: UserOutline, activeIcon: UserSolid, label: "پروفایل" },
];

const defaultOwnerItems: NavItem[] = [
  { path: "/owner", icon: GridOutline, activeIcon: GridSolid, label: "زمان‌بندی" },
  { path: "/owner/schedule", icon: ClockOutline, activeIcon: ClockSolid, label: "ساعات" },
  { path: "/owner/activity", icon: ChartOutline, activeIcon: ChartSolid, label: "تاریخچه" },
];

export function AppNavbar({ items }: AppNavbarProps) {
  const pathname = usePathname();
  const { openMenu } = useMenu();

  const isOwner = pathname.startsWith("/owner");
  const navItems = items ?? (isOwner ? defaultOwnerItems : defaultCustomerItems);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-background/85 backdrop-blur-2xl border-t border-border shadow-floating"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto max-w-lg flex items-stretch">
        {navItems.map(({ path, icon: OutlineIcon, activeIcon: SolidIcon, label }) => {
          const active = pathname === path;
          const Icon = active ? SolidIcon : OutlineIcon;
          return (
            <Link
              key={path}
              href={path}
              onClick={() => haptic.tap()}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 h-[60px] transition-all duration-200 press-feedback focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-md ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0 inset-x-3 h-[2px] rounded-full bg-foreground transition-all duration-300 ${
                  active ? "opacity-100 scale-x-100" : "opacity-0 scale-x-50"
                }`}
              />
              <Icon
                className={`relative h-[22px] w-[22px] transition-transform duration-200 ${active ? "scale-105" : ""}`}
                strokeWidth={active ? 0 : 1.5}
              />
              <span
                className={`relative text-[10px] leading-none transition-all ${active ? "font-bold" : "font-medium"}`}
              >
                {label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={() => {
            haptic.tap();
            openMenu();
          }}
          aria-label="منو"
          className="relative flex-1 flex flex-col items-center justify-center gap-1.5 h-[60px] transition-colors duration-200 text-muted-foreground hover:text-foreground press-feedback rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Bars3Icon className="h-[22px] w-[22px]" strokeWidth={1.5} />
          <span className="text-[10px] leading-none font-medium">منو</span>
        </button>
      </div>
    </nav>
  );
}
