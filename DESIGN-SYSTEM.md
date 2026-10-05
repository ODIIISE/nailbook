# Forehand Design System — V2 Specification

> One system, two experience modes: **Atelier** (functional) and **Editorial** (brand). 
> Persian-first, RTL-native, motion-aware, token-driven.
> **Source of truth:** `src/app/globals.css` (tokens), `src/lib/design-tokens.ts` (categorical), `src/components/ui/` (primitives), `src/lib/motion-governance.test.ts` (enforcement).

> **⚠ Palette update:** the color palette is now the **stock Astryx neutral theme**
> (`astryx.theme: @astryxdesign/theme-neutral` in `package.json`). The semantic
> blocks in `src/app/globals.css` (`:root` light + `.dark`) mirror its compiled
> defaults one-to-one — update them together with the theme. The espresso/gold
> Editorial palette is retired. Everything else in this document (structure,
> motion, RTL, governance) still applies.

---

## 1. Mental model

```
FOREHAND DESIGN SYSTEM
├── CORE         tokens · layout · grid · responsive · motion · a11y · RTL
├── COMPONENTS   Button · Input · Select · Dialog · Sheet · Toast · Card · …
├── MODES        Atelier (light/dark) · Editorial (homepage & brand moments)
├── CONTENT      UX-writing voice + patterns
└── GOVERNANCE   change control, drift gates, QA checklists
```

The homepage is the flagship **Editorial** expression — an approved, frozen visual reference. It is not a "hack" or an "exception": it is a mode of the same system, and this document describes it that way.

---

## 2. Token architecture (3 layers)

Defined in `globals.css`. Values flow one direction only:

```
LAYER 1 primitives (raw)   --espresso-900 · --cream-50 · --night-600 · --red-600 …
        ↓
LAYER 2 semantic (purpose) --background · --foreground · --card · --primary ·
                           --muted · --accent · --border · --ring · --shadow-* ·
                           --duration-* · --ease-* · --z-* · --page-gutter
        ↓
LAYER 3 component          --button-primary-bg · --input-focus-ring ·
                           --dialog-shadow · --toast-border · --booking-*
```

Rules:
- Components reference **semantic or component tokens only** — never primitives, never raw hex.
- Experience modes remap **Layer 2** only. Dark mode and Editorial are remappings, not new vocabularies.
- Never add a parallel token system (`--lux-*`, `--page-*`, `--fh-*` are all banned patterns going forward).
- Primitive scales: `--cream-*` (light surfaces), `--espresso-*` (ink), `--night-*` (dark surfaces), `--red/green/amber/blue-*` (feedback).

### Semantic tokens — Astryx neutral Light (`:root`, kept in sync, unreachable in-app)

`--background: #f1f1f1` · `--foreground: #000000` · `--card/popover: #fff` · `--primary: #000000` · `--secondary/muted: #f1f1f1` · `--muted-foreground: #474747` · `--accent: #fff` · `--accent-soft: #f1f1f1` · `--accent-foreground-soft: #474747` · `--destructive: #76000c` · `--success: #00490b` · `--warning: #4b3900` · `--border/input: #0000001f` · `--border-strong: #00000030` · `--ring: #0074e2`

### Semantic tokens — Astryx neutral Dark (`.dark`, the shipped theme)

`--background: #1b1b1b` · `--foreground: #ffffff` · `--card/popover: #1b1b1b` · `--primary: #f1f1f1` · `--secondary/muted: #262626` · `--muted-foreground: #9e9e9e` · `--accent: #262626` · `--accent-soft: #262626` · `--accent-foreground-soft: #9e9e9e` · `--destructive: #ffc4be` · `--success: #a4d6a3` · `--warning: #f8d36a` · `--border/input: #ffffff24` · `--border-strong: #ffffff3d` · `--ring: #6d9cfe`

### Sheet island (`.sheet-light` — white surface, black elements)

Every bottom sheet re-maps the layer: `--background/popover: #ffffff` · `--foreground: #161616` · `--card: #161616` · `--card-foreground: #ffffff` · `--primary: #161616` · `--primary-foreground: #ffffff` · `--muted: #f0f0f0` · `--muted-foreground: #5c5c5c` · `--border/input: #0000001f` · `--destructive: #c81e1e` · `--destructive-on-dark: #ff8a80` (danger text on black cards) · `--success: #00490b` · `--warning: #4b3900` · `--ring: #0074e2`. Text on black cards uses `text-card-foreground` (+ `/60` dims); selected-on-black uses card-foreground fills — never scoped `--primary`, which reads as the sheet's black CTA fill.

### Editorial mode

The Editorial surface (homepage) carries its own scoped composition tokens inside `lux-home.module.css` (espresso `#171310`, gold `#e2bd97`, champagne `#f2cdad`, cream `#e8e0d5`). They are **mode-local by design** (§ Homepage CSS isolation) — they never enter `globals.css` and never leak into other routes. Where a future Editorial moment needs a shared capability, it is added to Layer 2/3 globally with a generic name, not a homepage name.

---

## 3. Typography

**One functional family: Estedad FD** (variable 100–900, Farsi digits), preloaded. Vazirmatn fallback. No Latin display fonts in Atelier mode. `font-synthesis: none` globally.

### Functional type roles (utilities in globals.css)

| Role | Class | Size/Weight/LH | Use |
|---|---|---|---|
| Display | `.text-display` | 28px · 600 · 1.15 | Hero-less page headlines |
| H1 | `.text-h1` | 24px · 600 · 1.2 | Page titles |
| H2 | `.text-h2` | 20px · 500 · 1.25 | Section/card titles |
| H3 | `.text-h3` | 16px · 500 · 1.35 | Item titles |
| Body L | `.text-body-lg` | 16px · 400 · 1.6 | Important reading text |
| Body | `.text-body` | 14px · 350 · 1.55 | Default |
| Caption | `.text-caption` | 12px · 400 · 1.45 | Labels, metadata |
| Small | `.text-small` | 12px · 350 · 1.4 | Content floor — never smaller for readable text |
| Micro | `.text-micro` | 11px · 500 · 1.4 | Non-interactive metadata only (badges, kickers, weekday initials, tracking codes) — never body, buttons, or inputs |

### Editorial typography

Editorial moments may use display faces (Great Vibes script, Playfair Display) and larger scales — **scoped to Editorial surfaces only**. Script typography is a controlled accent: never body, form, or button typography. The homepage's type treatment is approved and frozen.

### Persian/RTL rules

- Logical properties only: `ps/pe`, `ms/me`, `inset-inline`, `text-align: start/end`. Physical `pl/pr/ml/mr` banned.
- Persian digits via `toPersianDigits`/`displayDigits`; Jalali dates via `src/lib/jalali.ts`.
- `dir="ltr"` islands for phone numbers, times, tracking codes, Latin brand names.

---

## 4. Layout, grid, gutter

- **Frame:** `--frame-max-w: min(100vw, 480px)` — phone-frame, centered on desktop. Owner/admin render in the same frame.
- **Gutter:** `--page-gutter: 1.25rem` — consumed via the `.page-gutter` utility (logical `padding-inline`). Page headers/footers/scroll containers use it; full-bleed sections opt out deliberately.
- **Containers (semantic roles):** `full` (fill frame), `reading` (narrow text), `form` (single-column forms), `dashboard` (owner data pages). Do not invent per-page arbitrary widths.
- **Grid:** `minmax`/`auto-fit` with `grid-cols-{2,3,4}` responsive collapse. Avoid fixed pixel column widths.
- **Safe areas:** `env(safe-area-inset-*)` on fixed headers, navs, sheets, footers.
- **Scrolling:** the app scrolls normally. Only the homepage is viewport-locked (its own container — never `html/body`).

---

## 5. Shape, borders, flatness

Sharp rectangles + pills. No shadows anywhere, no arbitrary radii:

- **Pill** (`rounded-full`): primary CTAs (`button default/paper`), chips, tags, badges/status pills, icon buttons, avatars, dots, switch, spinners. Everything else is sharp.
- **Rectangle** (`--radius: 0`, whole ladder 0): cards, inputs, sheets, dialogs, dropdowns, tooltips, tab segments, selection boxes — in **every state** (hover/active/disabled/invalid inherit the variant shape; focus ring `--focus-radius: 0`).
- **Borders:** 1px hairlines everywhere — never 2px+ except functional rings (spinners, selected checkboxes, dashed dropzones). `--border` is the natural default: black @12% light (`#0000001f`), white @14% dark (`#ffffff24`). `--border-strong` (black @19% / white @24%) is reserved for selected/emphasis edges. No decorative border stacking.
- **Flat:** `--shadow-*` tokens are `none`; `shadow-*` classes are banned. Separation comes from borders + surface contrast only. Sheets are solid white (`.sheet-light` island), not glass.
- **Type voice:** thin — every role one step lighter than a standard scale (display/h1 600, h2/h3 500, body 350, caption 400, micro 500 floor). Inline `font-*` follows the same shift (extrabold→bold→semibold→medium→normal).
- **Accessibility:** `contrast-governance.test.ts` enforces AA on all three surfaces (light/dark/sheet) **plus every interactive state** — icon glyphs on card and hover fill, primary/destructive hover and disabled, CTA chips, sheet dim text. A new variant or state without a matrix row fails review.

---

## 6. Motion system

Motion is allowed and tokenized. The more functional the screen, the more restrained the motion.

| Token | Range | Use |
|---|---|---|
| `--duration-instant` | ~60ms | State swaps, toggles |
| `--duration-micro` | ~150ms | Hovers, presses, small reveals |
| `--duration-standard` | ~240ms | Panels, sheets, fades |
| `--duration-expressive` | ~450ms | Feature emphasis |
| `--duration-editorial` | ~900ms | Homepage choreography |

Easings: `--ease-standard` (calm out), `--ease-spring` (playful press). All motion uses `transform`/`opacity`; layout properties are never animated.

**Governance (enforced by `motion-governance.test.ts`):**
1. No animation libraries (`framer-motion`, `tw-animate-css`) anywhere.
2. Raw CSS motion (`transition:`/`animation:`/`@keyframes`) exists only in: `globals.css` (system), Editorial homepage files, and stock `ui/` primitives.
3. App-level CSS must use `--duration-*`/`--ease-*` tokens — no raw durations.
4. `prefers-reduced-motion` reduces transforms/parallax/loops while keeping feedback (Editorial implements this; the system pattern lives in globals).

The homepage's existing motion is approved and unchanged (§22).

---

## 7. Z-index layers

`--z-base 0 · sticky 10 · header 40 · dropdown 50 · popover 60 · sheet 70 · dialog 80 · toast 90 · critical 100`. Raw `z-index: 9999` is a code-review reject. The Editorial homepage shell uses `--z-editorial: 40` (fixed surface, same band as headers).

---

## 8. Components (primitives in `src/components/ui/`)

shadcn structure on `@base-ui/react`: Button, Card, Input, Label, Select, Switch, Tabs, Badge, Separator, Skeleton, Tooltip, Dialog, AlertDialog, Sheet, Drawer, BottomSheet, DropdownMenu, Sonner.

Conventions:
- **Button:** variants primary/outline/secondary/ghost/destructive/link · sizes xs–2xl from `--btn-*` ladder · full-width CTA `h-12`/`h-14` · loading = spinner + text label, never spinner alone.
- **Input:** sizes from `--field-*` ladder (default xl) · focus ring `--input-focus-ring` · invalid state via `aria-invalid`.
- **Card:** flat 1px `--border` (or `--border-strong` for emphasis); use for grouping, selection, preview — not decoration. Avoid nesting.
- **Overlays:** focus trap, Escape, backdrop dismissal, scroll lock, focus restore. `BottomSheet` for focused mobile tasks; `Dialog` for confirmation.
- **Round icon button:** 44px minimum touch target.
- Do **not** create mode-duplicated components (`LuxButton`). One Button; the mode changes tokens/treatment. Conversely, do not force the homepage's editorial composition into generic component APIs — composition wrappers over shared primitives are fine (§49–50).

---

## 9. States

Common: default · hover · focus-visible · pressed · selected · disabled · loading · empty · error · success.
Booking: available · selected · reserved · confirmed · completed · cancelled · no-show — from `statusBadgeClass` (`design-tokens.ts`), always color + text (+ icon where needed), never color alone.
Data patterns: loading (Skeleton in `loading.tsx`) · empty (named, intentional) · partial · error (retry) · offline · permission. Customer surfaces degrade gracefully when owner data is missing.

---

## 10. Experience modes

| | Atelier | Editorial |
|---|---|---|
| Used by | owner/admin, forms, operations, data pages | homepage, portfolio, campaigns |
| Themes | light + dark | espresso/gold (self-contained) |
| Motion | instant/micro/standard only | expressive/editorial allowed |
| Typography | Estedad functional scale | + display faces, script accents |
| Surfaces | cards, tables, sheets | open, composition-led, restrained |
| Density | optimized for speed/accuracy | optimized for emotion/trust |

Same tokens, same primitives, same a11y — different controlled expression. Owner/admin must never inherit editorial decoration; editorial must never break system rules (contrast, targets, focus).

---

## 11. Responsive foundation

**Test targets:** 375 · 390 · 430 · 768 · 1024 · 1280 · 1440 (widths) and 667 · 740 · 844 · 932 (heights) — targets, not hardcoded breakpoints.

- **Width changes structure** (columns, navigation); **height changes density** (spacing, image height, gaps — never uniform scaling).
- Fluid first: `clamp()`, `min()/max()`, `minmax`, `aspect-ratio`, `dvh`, `env()`. Media queries only for genuine structural changes.
- Homepage: one-viewport (100dvh) with `grid-template-rows: auto minmax(0,1fr) auto`; height compression order = empty space → image height → gaps → CTA → decorative → typography (last).
- Fixed frames for media (`aspect-ratio` + `object-fit: cover`) — intrinsic dimensions never drive layout.

---

## 12. Accessibility

- 44px minimum touch targets (smaller visible icons inside larger hit areas allowed).
- Visible `focus-visible` ring (`--ring`); never remove without replacement.
- Dialogs: focus trap, Escape, backdrop dismissal, focus restore.
- Contrast AA in both themes; status never by color alone.
- `prefers-reduced-motion`: reduce transforms/parallax/loops, keep feedback.
- Semantic HTML; buttons for behavior, links for navigation (`tel:`, external URLs unintercepted).
- RTL verified, not assumed: logical properties, mirrored icons, mixed-script lines, `dir="ltr"` islands.

---

## 13. UX writing

Voice: calm, warm, confident, refined, concise, human. No sales-heavy, corporate, or cute phrasing.

- Primary CTA: «رزرو نوبت» · Secondary: «مشاهده نمونه کارها»
- Errors: what happened + how to fix («شماره وارد‌شده معتبر نیست»)
- Empty states: honest, never fake ("هنوز نمونه‌کاری ثبت نشده است")
- Approved product copy is data (`salon.*` owner fields) — never hardcode customer-facing strings.

---

## 14. Governance

Before adding anything, ask:
- **Token:** does an existing one solve this?
- **Component:** can an existing one take this variant?
- **Breakpoint:** does the fluid system actually fail?
- **Color:** semantic or merely decorative?
- **Motion:** what UX purpose does it serve?

Change classes: **A** required (architecture/function) → do · **B** safe refactor (same appearance) → do · **C** visual improvement → don't (separate task) · **D** new feature → don't.

### Do / Don't

- DO use semantic tokens. DON'T hardcode hex in components.
- DO use logical properties. DON'T patch with negative margins or `!important`.
- DO use `.page-gutter` and the frame. DON'T invent per-page widths.
- DO use `--z-*` layers. DON'T write raw z-index values.
- DO keep Editorial styles scoped to Editorial files. DON'T let them leak into booking/owner.
- DO keep one component per concept. DON'T fork components per mode.
- DO capture the homepage baseline before touching its styles. DON'T redesign the approved homepage.

### QA checklist

1. `npm run check` + `npm run check:build` green.
2. Homepage geometry diff vs baseline (5 viewports) — zero drift.
3. Real browser: ~390px + ≥1280px, light + dark, RTL correct, zero console errors.
4. Booking flow end-to-end; owner settings (gallery/phone/instagram/address) still function.
5. Motion governance tests pass; reduced-motion spot check.

---

*This document derives from the code. When tokens change in `globals.css`, update this spec and `docs/design-system.html` together.*
