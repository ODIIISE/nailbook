"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMenu } from "./menu-context";
import { useAuth } from "@/lib/auth-context";
import { can, isStaff, type StaffPermission } from "@/lib/staff-permissions";
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
  /** Staff-only destinations hide without this (server stays the real gate). */
  permission?: StaffPermission;
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
  // The timeline is the bookings surface — every staff role manages bookings.
  { path: "/owner", icon: GridOutline, activeIcon: GridSolid, label: "زمان‌بندی", permission: "bookings.manage" },
  { path: "/owner/schedule", icon: ClockOutline, activeIcon: ClockSolid, label: "ساعات", permission: "schedule.edit" },
  { path: "/owner/activity", icon: ChartOutline, activeIcon: ChartSolid, label: "تاریخچه", permission: "logs.view" },
];

export function AppNavbar({ items }: AppNavbarProps) {
  const pathname = usePathname();
  const { openMenu } = useMenu();
  const { user } = useAuth();

  const isOwner = pathname.startsWith("/owner");
  const ownerItems = isStaff(user?.roles)
    ? defaultOwnerItems.filter((item) => !item.permission || can(user?.roles, item.permission))
    : defaultOwnerItems;
  const navItems = items ?? (isOwner ? ownerItems : defaultCustomerItems);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-header)] bg-background border-t border-border"
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
              className={`relative flex-1 flex flex-col items-center justify-center gap-1.5 h-[60px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-none ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-0 inset-x-3 h-[2px] rounded-full bg-foreground ${
                  active ? "" : "hidden"
                }`}
              />
              <Icon
                className={`relative h-[22px] w-[22px]`}
                strokeWidth={active ? 0 : 1.5}
              />
              <span
                className={`relative text-small leading-none ${active ? "font-normal" : "font-normal"}`}
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
          className="relative flex-1 flex flex-col items-center justify-center gap-1.5 h-[60px] text-muted-foreground hover:text-foreground rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Bars3Icon className="h-[22px] w-[22px]" strokeWidth={1.5} />
          <span className="text-small leading-none font-normal">منو</span>
        </button>
      </div>
    </nav>
  );
}
