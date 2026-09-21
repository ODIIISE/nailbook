# Quickstart: Two-Tier Navigation — Manual Validation

**Feature**: specs/001-two-tier-navigation | **Prereq**: dev server (`npm run dev`) or the deployed preview

## Salon-mode app (customer side)

> Set `SALON_ID` (salon mode) or run without it for admin mode — validation differs.

1. **Navbar renders on main pages** — visit `/`, `/bookings`, `/profile`
   - ✅ Bottom navbar visible with خانه، نوبت‌ها، پروفایل، منو
   - ✅ Current page highlighted (solid icon + label)
   - ✅ Content not hidden behind navbar (scroll to bottom of /bookings)
2. **Menu opens from any page** — tap منو in the navbar on `/bookings`
   - ✅ Hamburger opens; contains account card (identity + active count + خروج), نمونه‌کارها, salon info, theme
   - ✅ No خانه/نوبت‌ها/پروفایل links in the menu
3. **Signed-out guest** — log out, visit `/`
   - ✅ Navbar still renders; ورود/حساب کاربری card present in menu; no duplicate primary links
4. **Booking flow unaffected** — start a booking at `/book`
   - ✅ No navbar; full-screen flow with its own back header

## Owner side

5. **Navbar unchanged** — visit `/owner`
   - ✅ Navbar: زمان‌بندی، ساعات، تاریخچه، منو (as today)
6. **Owner menu deduped** — open hamburger
   - ✅ Sections: مدیریت (خدمات، مشتری‌ها، نمونه‌کارها، تنظیمات سالن) + حساب (مشاهده سایت مشتری، خروج)
   - ✅ No داشبورد/ساعات کاری/تاریخچه links (navbar covers them)
7. **Reachability preserved** — ساعات کاری opens `/owner/schedule` via navbar; تاریخچه via navbar

## Admin platform mode (no SALON_ID)

8. **Admin landing** — visit `/`
   - ✅ No bottom navbar (landing keeps hamburger-only chrome); hamburger works

## Regression sweep

- Theme toggle from menu footer works on both sides
- No horizontal overflow at 360px width; RTL layout intact
- Console free of new errors/warnings during the walkthrough
