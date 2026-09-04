# Forehand Nailbook — Design System

> Warm atelier. One cream/ink palette, two themes, zero motion, Persian-first.
> This document is the implementation source of truth. Spec: `docs/superpowers/specs/2026-09-03-frontend-rebuild-design.md`.

---

## 1. Principles

1. **Stock shadcn structure, warm brand skin.** Default shadcn behavior and component structure; the palette is a warm cream/ink atelier (§3). Premium comes from consistency, spacing discipline, imagery, and typography — not effects.
2. **Zero motion.** No CSS `transition`/`animation`, no `animate-*` classes, no framer-motion, no View Transitions, no drag/swipe physics. State changes are instant. Enforced by `src/lib/no-motion.test.ts`.
3. **Persian-first.** RTL via logical properties (`ps/pe/ms/me/start/end`) — never physical (`pl/pr/ml/mr`). Persian digits via `toPersianDigits`. Jalali dates. `dir="ltr"` islands for phone numbers, times, tracking codes.
4. **One palette, no per-salon theming.** Multi-tenant, but the product has one visual identity.
5. **Accessible by default.** 44px minimum interactive targets, visible `focus-visible` rings, Escape/backdrop dismissal on every overlay, AA contrast.

## 2. Source of truth

| Layer | Source |
|---|---|
| Semantic CSS tokens (light + dark) | `src/app/globals.css` — `:root` / `.dark` |
| Categorical palettes (timeline blocks, charts, badges) | `src/lib/design-tokens.ts` |
| UI primitives | `src/components/ui/` (shadcn on `@base-ui/react`) |
| Zero-motion gate | `src/lib/no-motion.test.ts` |
| Product spec | `docs/superpowers/specs/2026-09-03-frontend-rebuild-design.md` |

Do not add raw hex values to components. Use semantic tokens; categorical colors come from `design-tokens.ts`.

## 3. Tokens

### Semantic (warm atelier — light)

`--background: #faf7f2` · `--foreground: #2a231e` · `--card/popover: #ffffff` · `--primary: #2a231e` · `--primary-foreground: #faf7f2` · `--secondary/muted: #f1ece4` · `--muted-foreground: #7d7166` · `--accent: #f6ede4` · `--accent-foreground: #4a3f36` · `--accent-soft: #f3e4da` · `--accent-foreground-soft: #8a6552` · `--destructive: #dc2626` · `--success: #16a34a` · `--warning: #b45309` · `--border/input: #eae3d9` · `--ring: #b0a396` · `--radius: 12px`

### Semantic (warm espresso — dark, `.dark`)

`--background: #171310` · `--foreground: #f5f0e9` · `--card/popover: #1f1a15` · `--primary: #f5f0e9` · `--primary-foreground: #241d17` · `--secondary/muted/accent: #2a231c` · `--muted-foreground: #b3a598` · `--accent-soft: #33261e` · `--accent-foreground-soft: #d9a68c` · `--destructive: #ef4444` · `--success: #22c55e` · `--warning: #f59e0b` · `--border/input: #332b23` · `--ring: #7d7166`

Derived radii: `sm = radius-4px`, `md = radius-2px`, `lg = radius`, `xl = radius+4px`.
Elevation: `--shadow-xs/card/elevated/floating` (subtle, layered; dark mode uses inset highlight).

## 4. Typography

- **Family:** Vazirmatn only (CDN `@font-face` in `globals.css`, preloaded in `app/layout.tsx`). No Latin display fonts.
- **Utilities** (class names fixed; stock-derived sizes):

| Class | Size | Weight |
|---|---|---|
| `.text-display` | 28px | 700 |
| `.text-h1` | 24px | 700 |
| `.text-h2` | 20px | 600 |
| `.text-h3` | 16px | 600 |
| `.text-body-lg` | 16px | 400 |
| `.text-body` | 14px | 400 |
| `.text-caption` | 12px | 500 |

- `font-synthesis: none` globally (Vazirmatn has no italics — never fake them).
- Phone numbers, times, IDs: wrap in `dir="ltr"`.

## 5. Layout

- Customer frame: `max-w-[var(--frame-max-w)]` (`min(100vw, 480px)`), centered.
- Spacing: Tailwind default 4px scale. Page gutter `px-5`; section rhythm `space-y-*`; card padding `p-4`.
- Safe areas: `env(safe-area-inset-*)` on fixed headers/nav/sheets.
- Scale: mobile-first (~390px leads); owner/admin render in the same frame, desktop just centers it.

## 6. Components

Stock shadcn primitives in `src/components/ui/`: button, card, input, label, select, tabs, badge, separator, skeleton, dialog, alert-dialog, sheet, drawer, bottom-sheet, dropdown-menu, tooltip, sonner. All open/close **instantly**.

Conventions:
- Round icon button: `flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm`.
- Primary action: `Button` default variant; full-width CTAs `h-12`/`h-14 w-full`.
- Cards: `rounded-lg border border-border bg-card p-4 shadow-card`. Avoid nesting cards.
- Status pills: `statusBadgeClass` from `src/lib/design-tokens.ts`.
- Overlays: keep focus trap, Escape, backdrop dismissal, body scroll lock, focus restore. `BottomSheet` for focused mobile tasks; `Dialog` for confirmation.
- Loading: static `Skeleton` layouts in route `loading.tsx`. No spinners as sole affordance — pair `Loader2` with a text label if needed.

## 7. Zero-motion policy (enforced)

Banned in `src/`: `transition` (CSS + Tailwind classes), `animation`, `@keyframes`, `animate-*` (`spin`, `pulse`, `in/out`, …), `duration-*`, `ease-*`, `will-change`, `framer-motion`, `tw-animate-css`, `startViewTransition`, drag/swipe gesture code. Sole exception: `src/lib/haptics.ts` (vibration is feedback, not motion).

The gate test `npm test -- src/lib/no-motion.test.ts` fails the suite on any violation, including in new code.

## 8. Quality checklist

Before shipping a visual change:

1. `npm run check` (lint + tsc + tests) and `npm run check:build` green.
2. Real-browser review at ~390px and ≥1280px, light + dark, RTL correct, zero console errors.
3. 44px targets, focus rings, Escape/backdrop dismissal verified.
4. Persian digits render; `dir="ltr"` on phones/times; no physical spacing classes (`pl/pr/ml/mr`).
5. No motion classes introduced (the gate test catches this automatically).
