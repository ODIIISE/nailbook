# Frontend Rebuild — Design Spec

> Date: 2026-09-03 · Status: Approved brainstorm output, pending user review
> Supersedes: DESIGN-SYSTEM.md (warm-paper `--qhp-*`/`--qbf-*` + Clean Slate dual system), PRODUCT.md visual notes

---

## 1. Problem

The front end carries **two coexisting design systems** (warm-paper `--qhp-*`/`--qbf-*` for the customer journey, "Clean Slate" monochrome for owner/admin/auth). The result is visual inconsistency, clutter, owner/admin screens that feel like an afterthought, and no coherent premium baseline.

## 2. Decision Log (from brainstorming session)

| # | Decision | Value |
|---|---|---|
| 1 | Scope | All surfaces: customer journey, owner dashboard, admin console, auth, core design system |
| 2 | Degree | Full UX + visual rebuild; IA may be restructured per surface during its migration |
| 3 | Visual identity | **Full stock shadcn** — neutral zinc palette, default radii/typography/surfaces. No custom theming, no glass/aurora/grain/gradient effects |
| 4 | Motion | **Zero, globally.** No CSS transitions, no keyframes, no framer-motion. Instant state changes everywhere |
| 5 | Components | Stock shadcn/Base UI primitives, default structure and behavior |
| 6 | Font | Vazirmatn (the one deviation from stock shadcn — forced by Persian) |
| 7 | Themes | Light + dark, both first-class, stock zinc values |
| 8 | Palette | One fixed palette for the whole product; **no per-salon theming** |
| 9 | Platform | Mobile-first PWA (~390px leads), scales up to desktop |
| 10 | Migration | Incremental, surface by surface; app shippable at every step (Approach A: retheme tokens → migrate surface → delete shims) |
| 11 | Content | Real Forehand content throughout (نام سالن، خدمات واقعی، شروع رزرو، نمونه‌کارها، منوی خدمات، نوبت‌های من) |
| 12 | References | Moodboard images + Moonlitt exploration served as taste calibration only; final direction is stock shadcn |

Note on #3 vs earlier "calm soft premium": the user explicitly downgraded from the Moonlit material direction to stock shadcn. The premium feel now comes from **consistency, spacing discipline, and typography**, not effects.

## 3. Architecture

### 3.1 Token layer (single source of truth)

One shadcn-standard semantic layer in `src/app/globals.css`:

- Keep semantic names already in use (`--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`), **replace values with stock shadcn zinc** (light: `--background: #fff`, `--primary: zinc-900`; dark: `--background: zinc-950`, `--primary: zinc-50`).
- Add `--success` and `--warning` (kept from current app; stock shadcn lacks them but status badges need them).
- **Delete:** the entire `--qhp-*` / `--qbf-*` warm-paper block, `.qhp-page` aliasing, booking-specific radius tokens (`--radius-booking-*`, `--qbf-r*`), paper texture variables, all `--dur-*` / `--ease-*` tokens (no motion).
- Radius: stock shadcn `--radius` (0.625rem) with the standard derived `--radius-sm/md/lg/xl`.
- `src/lib/design-tokens.ts` shrinks to: `servicePalette` (timeline block colors — data, not theme), `statusBadgeClass` (rebased on stock tokens), `chartColors` (rebased on zinc). Delete `themeColor()` helper and `statusColors` (fold into `statusBadgeClass` / component classes).

### 3.2 Zero-motion policy (enforced)

- `package.json`: **remove `framer-motion`** and **remove `tw-animate-css`** import from globals.css.
- Delete components: `layout/splash-screen.tsx`, `layout/page-transition.tsx`, `layout/loading-screen.tsx`, `layout/gradient-background.tsx`, `layout/paper-texture.tsx`, `booking/torn-paper-card.tsx`, `ui/pull-to-refresh.tsx`.
- Rewrite all `framer-motion` call sites (booking flow, owner timeline, homepage reveals) with plain conditional rendering — no animation replacement.
- Remove every `transition`, `transition-*`, `animate-*`, `motion-*` class and CSS rule. Sheets/dialogs open instantly.
- Route-level `loading.tsx` files (Next.js suspense fallbacks) **stay** — their content becomes static `Skeleton` layouts instead of the animated loading-screen component.
- Keep: `haptics.ts` (vibration is feedback, not motion), `device-theme-sync.tsx`, `use-theme.ts`.
- DB config fields `splash_title` / `splash_slogan` become inert (no consumer) — left in DB, ignored by UI.
- Lint guard: ESLint rule banning `transition|animate-|motion` classes in new code (follow-up task, not blocker).

### 3.3 Typography & Persian rules (unchanged from current app)

- Vazirmatn via existing CDN `@font-face` + preloads; Playfair Display removed (editorial identity artifact).
- Type utilities `.text-display/.text-h1/.text-h2/.text-h3/.text-body/.text-caption` re-derived from stock shadcn sizes (display 30px, h1 24, h2 20, h3 16, body 14, caption 12 — shadcn defaults).
- Jalali dates, Persian digits (`toPersianDigits`), `dir="ltr"` islands for phones/times/prices — all preserved as-is.

### 3.4 RTL rules

- Logical CSS only (`ps/pe`, `ms/me`, `start/end`). No `pl/pr/ml/mr`.
- Stock shadcn components are already logical-property-safe post-migration to Base UI; verify per component during migration.

## 4. Component inventory

**Keep (stock, restyled to zinc):** button, card, input, label, select, checkbox, switch, tabs, badge, separator, skeleton, dialog, alert-dialog, sheet, drawer, bottom-sheet, dropdown-menu, tooltip, sonner, error-boundary, salon-guard, service-image, image-crop, sticky-action-bar, whatsapp-icon, theme-toggle.

**Modify:** button (delete `paper` variant), card (delete torn-paper usage), bottom-sheet/sheet (remove spring physics; instant).

**Delete:** splash-screen, page-transition, loading-screen, gradient-background, paper-texture, torn-paper-card, pull-to-refresh.

**Add:** `table` (admin/owner lists), `form` (consistent field+error pattern), `toast` already exists via sonner.

## 5. Per-surface UX plans (structure retained, restyled stock; IA tweaks listed)

### 5.1 Customer journey (`/`, `/book`, `/bookings`)
- Homepage keeps the proven IA: hero → profile block (kicker/name/slogan/address/open-status) → primary CTA (شروع رزرو) → lookbook rail → numbered service menu (منوی خدمات) → hours + contact → bottom nav (خانه، رزرو نوبت، نوبت‌های من، پروفایل من).
- Changes: hero parallax/breathe/mask reveals removed (static image); magnetic CTA removed; lookbook opens in stock Sheet; menu rows become stock Card/List rows.
- Booking flow keeps the 5 steps (phone → PIN → service → Jalali date/time → confirm); stock Input, Jalali calendar restyled neutral, confirm page uses stock Card + Button.

### 5.2 Owner dashboard (`/owner/*`)
- Timeline, services manager, schedule, users, highlights, settings, activity — restyled on stock primitives; earnings/manual-booking/block-time modals become stock Dialog/BottomSheet.
- IA change: navigation consolidates into one consistent header + tab bar pattern (currently mixed drawer/menu-context).

### 5.3 Admin console (`/admin/*`)
- Salons table, salon detail, import/export, migrate, reports: stock Table + Dialog patterns; recharts colors rebased to zinc + status colors.

### 5.4 Auth (`/login`, `/owner/login`, `/admin/login`)
- Stock centered Card form; OTP input keeps 44px targets; Google button uses stock outline variant.

## 6. Migration order

1. **Groundwork:** replace globals.css tokens with stock zinc (+success/warning), remove motion deps/components, keep old vars as aliases (`.qhp-*` classes still resolve) — app compiles and ships.
2. **Auth pages** (small, isolated).
3. **Customer home + booking flow** (money path) — delete `--qhp-*` aliases for these routes as they migrate.
4. **Owner dashboard.**
5. **Admin console.**
6. **Cleanup:** delete remaining aliases, old components, design-tokens dead code; update DESIGN-SYSTEM.md (rewrite as stock-shadcn + Persian rules doc).

Each phase: `npm run check` green, visual review desktop+mobile, then next phase.

## 7. QA gates (definition of done, per phase)

- `npm run check` (lint + tsc + vitest) and `check:build` pass.
- Real-browser visual review (Playwright/msedge): desktop ≥1280px + mobile ~390px, light + dark, RTL correct, zero console errors.
- No `transition|animate-|framer-motion` remnants in migrated files (`grep` gate).
- All interactive targets ≥44px; focus states visible; Escape/backdrop dismissal works for sheets/dialogs.
- Persian digits and Jalali dates render; phone/time islands are `dir="ltr"`.

## 8. Risks

- **Silent visual regressions on unmigrated routes** during alias period — mitigated by aliasing old vars to new tokens (phase 1).
- **framer-motion call-site rewrites** may change perceived behavior (e.g., sheet spring → instant). Accepted: this is the explicit decision.
- **DB splash fields orphaned** — harmless; owner settings UI keeps writing them until cleanup phase removes the fields from settings form.
- **Dark-mode contrast of status colors** — verify `--success`/`--warning` against zinc-950 during phase 1.
