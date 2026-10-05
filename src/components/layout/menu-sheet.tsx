"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Globe,
  Images,
  LogIn,
  LogOut,
  MapPin,
  Phone,
  Scissors,
  Settings,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSalon } from "@/lib/salon-context";
import { useMenu } from "./menu-context";
import { haptic } from "@/lib/haptics";
import { displayDigits } from "@/lib/digits";
import { toPersianDigits } from "@/lib/jalali";
import { getTehranDateKey } from "@/lib/time";
import { Separator } from "@/components/ui/separator";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* Active = the statuses /api/read/bookings treats as availability blocks,
 * still in the future. A past "confirmed" row is history, not active. */
const ACTIVE_BOOKING_STATUSES = new Set(["reserved", "confirmed", "in_progress"]);

type MenuTone = "default" | "danger";

const ITEM_BASE =
  "flex min-h-11 items-center gap-3 rounded-none px-3 text-body text-start hover:bg-muted";
const ICON_MUTED = "flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground";
const ICON_DANGER = "flex h-4 w-4 shrink-0 items-center justify-center text-destructive";

function MenuLink({
  href,
  icon,
  label,
  tone = "default",
}: {
  href: string;
  icon?: ReactNode;
  label: string;
  tone?: MenuTone;
}) {
  const { closeMenu } = useMenu();
  const pathname = usePathname();
  const danger = tone === "danger";
  // Exact match for /owner, prefix match elsewhere so /owner/users marks its item.
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={() => {
        haptic.tap();
        closeMenu();
      }}
      className={`${ITEM_BASE} font-semibold ${
        danger
          ? "text-destructive hover:bg-destructive/10"
          : active
            ? "bg-muted text-primary"
            : "text-foreground"
      }`}
    >
      {icon ? <span className={danger ? ICON_DANGER : active ? "text-primary" : ICON_MUTED} aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </Link>
  );
}

function MenuAction({
  onClick,
  icon,
  label,
  tone = "default",
  closeOnClick = true,
}: {
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  tone?: MenuTone;
  closeOnClick?: boolean;
}) {
  const { closeMenu } = useMenu();
  const danger = tone === "danger";
  return (
    <button
      type="button"
      onClick={() => {
        haptic.tap();
        if (closeOnClick) closeMenu();
        onClick();
      }}
      className={`w-full ${ITEM_BASE} ${danger ? "text-destructive hover:bg-destructive/10" : "text-foreground"}`}
    >
      {icon ? <span className={danger ? ICON_DANGER : ICON_MUTED} aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </button>
  );
}

function InfoRow({
  icon,
  label,
  value,
  dir,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  dir?: "ltr";
  href?: string;
}) {
  const body = (
    <>
      <span className="mt-0.5 text-muted-foreground" aria-hidden="true">{icon}</span>
      <span className="min-w-0">
        <span className="block text-small font-semibold text-foreground">{label}</span>
        <span className="block text-small leading-relaxed text-muted-foreground" dir={dir}>{value}</span>
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} className="flex min-h-11 items-center gap-3 rounded-none p-1 hover:bg-muted">
        {body}
      </a>
    );
  }
  return <div className="flex items-start gap-3 p-1">{body}</div>;
}

function SalonInfoSection() {
  const { salon } = useSalon();
  const hours = salon.working_hours_text?.trim() ?? "";
  const address = salon.address?.trim() ?? "";
  const phone = salon.phone?.trim() ?? "";

  return (
    <section aria-label="اطلاعات سالن" className="space-y-2 px-1">
      <p className="text-micro font-bold text-muted-foreground">اطلاعات سالن</p>
      <InfoRow icon={<Clock className="h-4 w-4" />} label="ساعات کاری" value={hours || "ثبت نشده است"} />
      <InfoRow icon={<MapPin className="h-4 w-4" />} label="آدرس" value={address || "ثبت نشده است"} />
      {phone ? (
        <InfoRow
          icon={<Phone className="h-4 w-4" />}
          label="تلفن"
          value={displayDigits(phone)}
          dir="ltr"
          href={`tel:${phone.replace(/\s+/g, "")}`}
        />
      ) : (
        <InfoRow icon={<Phone className="h-4 w-4" />} label="تلفن" value="ثبت نشده است" />
      )}
    </section>
  );
}

function AccountCard({ onRequestLogout }: { onRequestLogout?: () => void }) {
  const { user } = useAuth();
  const { bookings, loaded } = useSalon();
  const { closeMenu } = useMenu();

  const activeCount = useMemo(() => {
    if (!user || !loaded) return 0;
    const today = getTehranDateKey(new Date());
    return bookings.filter(
      (b) =>
        (b.user_id === user.id || b.customer_phone === user.phone) &&
        ACTIVE_BOOKING_STATUSES.has(b.status) &&
        b.date_gregorian >= today,
    ).length;
  }, [user, loaded, bookings]);

  if (!user) {
    return (
      <Link
        href="/login"
        onClick={() => {
          haptic.tap();
          closeMenu();
        }}
        className="flex min-h-14 items-center gap-3 rounded-none border border-border bg-card px-4 py-3 hover:bg-muted/60"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <LogIn className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-h3 font-bold text-foreground">حساب کاربری</span>
          <span className="block text-small text-muted-foreground">ورود / ثبت‌نام</span>
        </span>
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    );
  }

  return (
    <section aria-label="حساب کاربری" className="rounded-none border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-h3 font-bold text-foreground">{user.name?.trim() || "کاربر"}</p>
          <p className="text-small text-muted-foreground" dir="ltr">{displayDigits(user.phone)}</p>
        </div>
      </div>

      <div className="mt-3 flex min-h-11 items-center justify-between gap-2 border-t border-border pt-3">
        {/* Navbar-covered destinations (نوبت‌ها/پروفایل) intentionally live
        only in the bottom navbar — see specs/001-two-tier-navigation. */}
        {activeCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-micro font-bold text-primary">
            {toPersianDigits(activeCount)} رزرو فعال
          </span>
        ) : (
          <span className="text-small text-muted-foreground">رزرو فعالی ندارید</span>
        )}
      </div>

      <div className="mt-2 space-y-0.5 border-t border-border pt-2">
        <button
          type="button"
          onClick={() => {
            haptic.tap();
            onRequestLogout?.();
          }}
          className="flex min-h-11 w-full items-center rounded-none px-2 text-small font-semibold text-destructive hover:bg-destructive/10"
        >
          خروج از حساب
        </button>
      </div>
    </section>
  );
}

function OwnerAccountCard() {
  const { user } = useAuth();
  const { salon } = useSalon();

  return (
    <section aria-label="حساب مدیریت" className="rounded-none border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-h3 font-bold text-foreground">{user?.name?.trim() || "مدیر"}</p>
          <p className="truncate text-small text-muted-foreground">{salon.name?.trim() || "پنل مدیریت"}</p>
        </div>
      </div>
    </section>
  );
}

function GuestContent() {
  return (
    <>
      <AccountCard />
      <div className="mt-3 space-y-1">
        <MenuLink href="/portfolio" icon={<Images className="h-4 w-4" />} label="نمونه‌کارها" />
      </div>
      <Separator className="my-4" />
      <SalonInfoSection />
    </>
  );
}

function CustomerContent({ onRequestLogout }: { onRequestLogout: () => void }) {
  return (
    <>
      <AccountCard onRequestLogout={onRequestLogout} />
      <div className="mt-3 space-y-1">
        <MenuLink href="/portfolio" icon={<Images className="h-4 w-4" />} label="نمونه‌کارها" />
      </div>
      <Separator className="my-4" />
      <SalonInfoSection />
    </>
  );
}

function OwnerContent({ onRequestLogout }: { onRequestLogout: () => void }) {
  return (
    <>
      <OwnerAccountCard />
      {/* Primary owner destinations (داشبورد، ساعات، تاریخچه) live in the
      bottom navbar — the menu carries only secondary management surfaces
      (specs/001-two-tier-navigation). */}
      <p className="mt-3 mb-1 px-3 text-micro font-bold text-muted-foreground">مدیریت</p>
      <div className="space-y-1">
        <MenuLink href="/owner/services" icon={<Scissors className="h-4 w-4" />} label="خدمات" />
        <MenuLink href="/owner/users" icon={<Users className="h-4 w-4" />} label="مشتری‌ها" />
        <MenuLink href="/owner/highlights" icon={<Images className="h-4 w-4" />} label="نمونه‌کارها" />
        <MenuLink href="/owner/settings" icon={<Settings className="h-4 w-4" />} label="تنظیمات سالن" />
      </div>
      <Separator className="my-4" />
      <div className="space-y-1">
        <MenuLink href="/" icon={<Globe className="h-4 w-4" />} label="مشاهده سایت مشتری" />
        <MenuAction
          onClick={onRequestLogout}
          icon={<LogOut className="h-4 w-4" />}
          label="خروج از حساب"
          tone="danger"
          closeOnClick={false}
        />
      </div>
    </>
  );
}

export function MenuSheet() {
  const { open, closeMenu } = useMenu();
  const { user, isOwner, logout } = useAuth();
  const { salon } = useSalon();
  const router = useRouter();
  const pathname = usePathname();
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);
  // Dismissing the sheet (Escape / route change) also cancels a pending
  // logout confirmation — reset during render to avoid an effect cascade.
  if (!open && confirmLogout) {
    setConfirmLogout(false);
  }

  const role = !user ? "guest" : isOwner ? "owner" : "customer";

  const handleLogout = async () => {
    setConfirmLogout(false);
    closeMenu();
    await logout();
    router.push(pathname.startsWith("/owner") ? "/owner/login" : "/");
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={closeMenu}
        title={salon.name?.trim() || "منو"}
      >
        <nav aria-label="منوی اصلی">
          {role === "guest" && <GuestContent />}
          {role === "customer" && <CustomerContent onRequestLogout={() => setConfirmLogout(true)} />}
          {role === "owner" && <OwnerContent onRequestLogout={() => setConfirmLogout(true)} />}
        </nav>

        {role !== "owner" && (
          <div className="mt-4 border-t border-border py-2 text-center">
            <Link
              href="/owner/login"
              onClick={() => {
                haptic.tap();
                closeMenu();
              }}
              className="inline-flex min-h-11 items-center gap-1.5 px-3 text-caption text-muted-foreground hover:text-foreground"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              ورود مدیریت
            </Link>
          </div>
        )}
      </BottomSheet>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="max-w-[300px]">
          <AlertDialogHeader>
            <AlertDialogTitle>خروج از حساب</AlertDialogTitle>
            <AlertDialogDescription>
              مطمئن هستید که می‌خواهید از حساب خود خارج شوید؟ نوبت‌های شما محفوظ می‌ماند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleLogout}>خروج</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
