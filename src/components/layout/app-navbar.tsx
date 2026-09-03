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
      aria-label="ناوبری اصلی"
      className="fixed bottom-4 left-1/2 z-20 w-[240px] -translate-x-1/2"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="glass flex items-center justify-between rounded-full px-3 py-2 backdrop-blur-md">
        {navItems.map(({ path, icon: OutlineIcon, activeIcon: SolidIcon, label }) => {
          const active = pathname === path;
          const Icon = active ? SolidIcon : OutlineIcon;
          return (
            <Link
              key={path}
              href={path}
              onClick={() => haptic.tap()}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
            >
              <span
                aria-hidden="true"
                className={`flex h-[58px] w-[58px] items-center justify-center rounded-full ${
                  active ? "bg-white text-black" : "glass text-foreground/80"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 0 : 1.5} />
              </span>
              <span className={`mt-1 text-[12px] font-normal leading-none ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {isOwner && (
          <button
            onClick={() => {
              haptic.tap();
              openMenu();
            }}
            aria-label="منو"
            className="flex flex-col items-center gap-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          >
            <span aria-hidden="true" className="glass flex h-[58px] w-[58px] items-center justify-center rounded-full text-foreground/80">
              <Bars3Icon className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <span className="mt-1 text-[12px] font-normal leading-none text-muted-foreground">منو</span>
          </button>
        )}
      </div>
    </nav>
  );
}
