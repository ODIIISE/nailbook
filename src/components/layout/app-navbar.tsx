"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMenu } from "./menu-context";

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
  const router = useRouter();
  const { openMenu } = useMenu();

  const isOwner = pathname.startsWith("/owner");
  const navItems = items ?? (isOwner ? defaultOwnerItems : defaultCustomerItems);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 bg-background/90 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto max-w-lg flex items-stretch">
        {navItems.map(({ path, icon: OutlineIcon, activeIcon: SolidIcon, label }) => {
          const active = pathname === path;
          const Icon = active ? SolidIcon : OutlineIcon;
          return (
            <button
              key={path}
              onClick={() => router.push(path)}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-[56px] transition-colors duration-200 ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 0 : 1.5} />
              <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-normal"}`}>
                {label}
              </span>
            </button>
          );
        })}

        <button
          onClick={openMenu}
          className="flex-1 flex flex-col items-center justify-center gap-1.5 h-[56px] transition-colors duration-200 text-muted-foreground"
        >
          <Bars3Icon className="h-[22px] w-[22px]" strokeWidth={1.5} />
          <span className="text-[10px] leading-none font-normal">منو</span>
        </button>
      </div>
    </nav>
  );
}
