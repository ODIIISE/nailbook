# Research: Two-Tier Navigation Without Duplication

**Feature**: specs/001-two-tier-navigation | **Date**: 2026-09-22

## R1: How to give customer pages shared chrome without changing URLs

**Decision**: Use a Next.js route group `src/app/(main)/` containing `page.tsx`, `bookings/`, `profile/`, with a group-level `layout.tsx` that renders bottom padding and the `AppNavbar`.

**Rationale**: Route groups are Next.js's built-in mechanism for shared layouts that don't affect routing. Zero URL changes means no updates needed to links (`/bookings`, `/profile`), auth redirects, middleware, or metadata. A per-page navbar injection would repeat markup in 4+ files and drift over time.

**Alternatives considered**:
- Per-page `<AppNavbar />` imports — rejected: repetition, easy to forget on new pages, violates DRY.
- Root-layout conditional — rejected: root layout wraps `/book`, `/owner`, `/login` too; conditionals there would sprawl.
- Client-side portal navbar mounted in Providers — rejected: hydration complexity for zero benefit; server layout is simpler.

## R2: Navbar visibility in admin (multi-salon) mode vs salon mode

**Decision**: The `(main)/layout.tsx` (server component) calls `isSalonMode()` and renders `AppNavbar` only in salon mode; admin-platform homepage keeps its current hamburger-only landing.

**Rationale**: `src/app/page.tsx` already branches server-side on `isSalonMode()`; the group layout can do the same without client-side env leaks. The admin platform is a different surface (its "nav" is the landing CTA grid); forcing a salon navbar there would misrepresent the product.

**Alternatives considered**: Navbar everywhere — rejected: wrong chrome for the admin platform landing.

## R3: What exactly counts as duplication in the customer hamburger

**Decision**: Remove the AccountCard's inner پروفایل / رزروهای من / مشاهده رزروها link rows (navbar covers these); keep the card as identity + active-reservation count + logout (logout and ورود are not navbar destinations). Keep نمونه‌کارها (portfolio) in the menu — it is not a navbar item.

**Rationale**: The spec's SC-001 requires zero overlapping destinations. The card's link rows were exactly the duplication the user pointed at; keeping identity + state in the card preserves the menu's "account" purpose.

**Alternatives considered**: Keep card links and call them "shortcuts" — rejected: user explicitly asked for no duplicate items.

## R4: Owner hamburger after dedupe

**Decision**: Owner menu = OwnerAccountCard + مدیریت section (خدمات، مشتری‌ها، نمونه‌کارها، تنظیمات سالن) + حساب section (مشاهده سایت مشتری، خروج). The روزانه section (dashboard/working-hours/activity) disappears from the menu.

**Rationale**: The owner navbar already covers those three; the previous audit added them to the menu to fix *reachability*, but with the navbar established as the primary surface the menu must not repeat them.

**Alternatives considered**: Keep a single mixed list — rejected: labeled sections communicate the two-tier split.

## R5: Safe-area and content clearance

**Decision**: Wrap `(main)` children in `pb-[calc(60px+env(safe-area-inset-bottom))]`; reuse `AppNavbar`'s existing 60px row + safe-area padding unchanged.

**Rationale**: Same approach as the owner layout (`pb-20`) but computed from the navbar's real height, so iPhone home-indicator devices don't hide content.

**Alternatives considered**: Adding padding inside each page — rejected: repetition; group layout centralizes it.

## R6: Route moves are behavior-neutral

**Decision**: Move `page.tsx`, `bookings/page.tsx`, `bookings/[id]/page.tsx`, `profile/page.tsx` into `(main)/` verbatim; verified none of them use relative imports that would break, and no code references their file paths.

**Rationale**: Verified by grep: only `src/app/book/page.tsx` imports a sibling (`./route-shell`) and it stays outside the group. No test imports page files.

**Alternatives considered**: n/a.
