"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AtSign,
  Globe,
  Images,
  LogOut,
  Phone,
  Scissors,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isStaff } from "@/lib/staff-permissions";
import { useSalon } from "@/lib/salon-context";
import { useMenu } from "./menu-context";
import { haptic } from "@/lib/haptics";
import { displayDigits } from "@/lib/digits";
import { Drawer } from "@/components/ui/drawers";
import { Monogram } from "@/components/ui/nail";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MenuTone = "default" | "danger";

const ITEM_BASE =
  "flex w-full min-h-12 items-center gap-3 border-b border-white/5 px-1 py-3 text-start text-[16px] hover:bg-white/[.03]";
const ICON_MUTED = "flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[var(--mut)]";
const ICON_DANGER = "flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[var(--wine-hi)]";

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
      className={`${ITEM_BASE} ${
        danger
          ? "text-[var(--wine-hi)]"
          : active
            ? "text-[var(--pearl)]"
            : ""
      }`}
    >
      {icon ? <span className={danger ? ICON_DANGER : active ? "text-[var(--pearl)]" : ICON_MUTED} aria-hidden="true">{icon}</span> : null}
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
      className={`w-full ${ITEM_BASE} ${danger ? "text-[var(--wine-hi)]" : ""}`}
    >
      {icon ? <span className={danger ? ICON_DANGER : ICON_MUTED} aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </button>
  );
}

function SalonInfoSection() {
  const { salon } = useSalon();
  const hours = salon.working_hours_text?.trim() ?? "";
  const address = salon.address?.trim() ?? "";
  const phone = salon.phone?.trim() ?? "";

  return (
    <section aria-label="اطلاعات سالن" style={{ marginTop: 18 }}>
      <div className="t-s" style={{ marginBottom: 10 }}>اطلاعات سالن</div>
      <div className="list">
        {hours ? (
          <div className="sum">
            <span className="mute">ساعات کاری</span>
            <span>{hours}</span>
          </div>
        ) : null}
        {address ? (
          <div className="sum">
            <span className="mute">آدرس</span>
            <span>{address}</span>
          </div>
        ) : null}
      </div>
      <div className="row" style={{ marginTop: 14, gap: 10 }}>
        {phone ? (
          <a className="btn gl sm" href={`tel:${phone.replace(/\s+/g, "")}`}>
            <Phone size={16} strokeWidth={1.4} /> تماس
          </a>
        ) : null}
        {salon.instagram_handle ? (
          <a
            className="btn gl sm"
            href={`https://instagram.com/${salon.instagram_handle.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            <AtSign size={16} strokeWidth={1.4} /> اینستاگرام
          </a>
        ) : null}
      </div>
    </section>
  );
}

function AccountCard({ onRequestLogout }: { onRequestLogout?: () => void }) {
  const { user } = useAuth();
  const { closeMenu } = useMenu();

  if (!user) {
    return (
      <>
        <div className="h-m">خوش آمدید</div>
        <p className="t-s" style={{ marginBottom: 14 }}>
          برای دیدن نوبت‌ها وارد شوید.
        </p>
        <Link
          href="/login"
          onClick={() => {
            haptic.tap();
            closeMenu();
          }}
          className="btn gl sm"
        >
          ورود / ثبت‌نام
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="row" style={{ padding: "4px 0 22px" }}>
        <Monogram name={user.name} size={52} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19 }}>{user.name?.trim() || "کاربر"}</div>
          <div className="t-s ltr">{displayDigits(user.phone)}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          haptic.tap();
          onRequestLogout?.();
        }}
        className="btn ghost sm"
        style={{ padding: 0, marginTop: 4 }}
      >
        <LogOut size={16} strokeWidth={1.4} /> خروج از حساب
      </button>
    </>
  );
}
function OwnerAccountCard() {
  const { user } = useAuth();
  const { salon } = useSalon();

  return (
    <div className="row" style={{ padding: "4px 0 22px" }}>
      <Monogram name={salon.name} size={52} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 19 }}>{user?.name?.trim() || "مدیر"}</div>
        <div className="t-s">{salon.name?.trim() || "پنل مدیریت"}</div>
      </div>
    </div>
  );
}

function GuestContent() {
  return (
    <>
      <AccountCard />
      <div style={{ marginTop: 10 }}>
        <MenuLink href="/portfolio" icon={<Images className="h-4 w-4" />} label="نمونه‌کارها" />
      </div>
      <SalonInfoSection />
    </>
  );
}

function CustomerContent({ onRequestLogout }: { onRequestLogout: () => void }) {
  return (
    <>
      <AccountCard onRequestLogout={onRequestLogout} />
      <div style={{ marginTop: 10 }}>
        <MenuLink href="/portfolio" icon={<Images className="h-4 w-4" />} label="نمونه‌کارها" />
      </div>
      <SalonInfoSection />
    </>
  );
}

function OwnerContent({ onRequestLogout }: { onRequestLogout: () => void }) {
  const { hasPermission } = useAuth();
  // Staff see the management section filtered to their permissions —
  // artists (bookings only) get the account card and site links alone.
  const showServices = hasPermission("services.edit");
  const showUsers = hasPermission("users.manage");
  const showSettings = hasPermission("settings.edit");
  return (
    <>
      <OwnerAccountCard />
      {/* Primary owner destinations (داشبورد، ساعات، تاریخچه) live in the
      bottom navbar — the menu carries only secondary management surfaces
      (specs/001-two-tier-navigation). */}
      {(showServices || showUsers || showSettings) && (
        <>
          <div className="t-s" style={{ margin: "14px 0 2px" }}>مدیریت</div>
          <div>
            {showServices && <MenuLink href="/owner/services" icon={<Scissors className="h-4 w-4" />} label="خدمات" />}
            {showUsers && <MenuLink href="/owner/users" icon={<Users className="h-4 w-4" />} label="مشتری‌ها" />}
            {showServices && <MenuLink href="/owner/highlights" icon={<Images className="h-4 w-4" />} label="نمونه‌کارها" />}
            {showSettings && <MenuLink href="/owner/settings" icon={<Settings className="h-4 w-4" />} label="تنظیمات سالن" />}
          </div>
        </>
      )}
      <div style={{ marginTop: 10 }}>
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

  const role = !user ? "guest" : isOwner ? "owner" : isStaff(user.roles) ? "staff" : "customer";

  const handleLogout = async () => {
    setConfirmLogout(false);
    closeMenu();
    await logout();
    router.push(pathname.startsWith("/owner") ? "/owner/login" : "/");
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={closeMenu}
      >
        <nav aria-label="منوی اصلی">
          {role === "guest" && <GuestContent />}
          {role === "customer" && <CustomerContent onRequestLogout={() => setConfirmLogout(true)} />}
          {(role === "owner" || role === "staff") && <OwnerContent onRequestLogout={() => setConfirmLogout(true)} />}
        </nav>

        {(role === "guest" || role === "customer") && (
          <footer>
            <Link
              href="/owner/login"
              onClick={() => {
                haptic.tap();
                closeMenu();
              }}
              className="set"
            >
              <ShieldCheck size={17} strokeWidth={1.4} />
              ورود مدیریت
            </Link>
          </footer>
        )}
      </Drawer>

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
