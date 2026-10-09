# Forehand Design System — V3 Specification (Studio)

> One warm-dark cinematic system for every route. Persian-first, RTL-native,
> motion-rich, token-driven.
> **Source of truth:** `src/app/globals.css` (tokens + kit classes),
> `src/lib/design-tokens.ts` (categorical), `src/components/ui/` (primitives),
> `src/lib/motion-governance.test.ts` + `src/lib/contrast-governance.test.ts` (enforcement).
> Reference: v2 prototype (`forehand-v-2.html`) — flows, composition, and feel.
> Backend stays real (OTP auth, APIs, permission matrix); only the expression changed.

> **Supersedes:** the Astryx-neutral monochrome system (v2 spec) and the
> espresso/gold Editorial split. There is one theme now — warm dark — shared
> by customer, owner, and homepage alike. No light mode, no mode islands.

---

## 1. Mental model

```
FOREHAND DESIGN SYSTEM
├── CORE         tokens · layout · grid · responsive · motion · a11y · RTL
├── COMPONENTS   Btn · IconBtn · Chip · Badge · Field/Input · Switch · Seg ·
│                Sheet · Drawer · Toast · Calendar · Slots · Table · Timeline
├── SCREENS      customer (booking/auth/receipt/menu) · console (timeline/…
├── CONTENT      UX-writing voice + patterns
└── GOVERNANCE   change control, drift gates, QA checklists
```

---

## 2. Token architecture (3 layers)

Defined in `globals.css`. Values flow one direction only:

```
LAYER 1 primitives (raw)   --bg · --ink · --pearl · --rose · --wine · --gold ·
                           --sage · --line · --glass …
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
- The v2 kit classes (`.btn`, `.chip`, `.badge`, `.field`, `.slot`, …) live in
  `globals.css` as the system — they are the vocabulary, not overrides.
- Never add a parallel token system (`--lux-*`, `--page-*`, `--fh-*` stay banned).
- Primitive scales: `--bg*` (surfaces), `--ink/--pearl` (ink), `--rose/--wine`
  (signal), `--gold` (accent), `--sage` (success).

### Semantic tokens (sole theme — warm dark, `:root` and `.dark` identical)

`--background: #12100e` · `--foreground: #efe7db` · `--card/popover: #1a1613`
· `--primary: #e9dcc3` (pearl) · `--primary-foreground: #1b1511`
· `--secondary/muted: #221d19` · `--muted-foreground: rgba(239,231,219,.62)`
· `--accent: #d4b06a` (gold) · `--destructive: #d0687a` · `--success: #a9b79a`
· `--warning: #d4b06a` · `--border/input: rgba(239,231,219,.09)`
· `--border-strong: rgba(239,231,219,.16)` · `--ring: #e9dcc3`
· glass: `rgba(32,27,23,.56)` + blur(20-24px) saturate(1.3)

### Lacquer vocabulary (signature colors, `LACQUERS` in `types.ts`)

`pearl/wine/gold/rose/mocha/nude/ink` — service + artist identity (gradients,
monograms). Stored per row (`lacquer`, migration 030), validated at the API
boundary, never hardcoded in components: map through `design-tokens.ts`.

### Booking status tones

reserved = pearl dashed · confirmed = gold · completed = sage · cancelled = mute
· noshow = wine · in_progress = gold. Always color + text (+ icon where
needed), never color alone.

---

## 3. Typography

**One family: Vazirmatn variable** (100–900), preloaded. Thin voice — hierarchy
through size + spacing, never weight.

| Role | Class | Size/Weight/LH | Use |
|---|---|---|---|
| Display | `.text-display` | 44px · 100 · 1.25 | Brand headlines |
| H1 | `.text-h1` | 32px · 100 · 1.35 | Page titles |
| H2 | `.text-h2` | 22px · 200 · 1.5 | Section/drawer titles |
| H3 | `.text-h3` | 16px · 300 · 1.5 | Item titles |
| Body L | `.text-body-lg` | 16px · 300 · 1.9 | Important reading text |
| Body | `.text-body` | 14px · 300 · 1.7 | Default (mute tier) |
| Caption | `.text-caption` | 12px · 400 · 1.45 | Labels, metadata |
| Small | `.text-small` | 12px · 350 · 1.4 | Content floor |
| Micro | `.text-micro` | 11px · 500 · 1.4 | Non-interactive metadata only |
| Kicker | `.text-kicker` | 11px · 600 · 1.4 + ls | Latin eyebrow metadata |

### Persian/RTL rules

- Logical properties only (`ps/pe`, `ms/me`, `inset-inline`, `start/end`).
- Persian digits via `toPersianDigits`/`displayDigits`; Jalali via `src/lib/jalali.ts`.
- `dir="ltr"` islands for phones, times, codes, Latin brand names.
- Latin display lines (wordmarks, kickers) use `letter-spacing` + thin weights.

---

## 4. Layout, grid, gutter

- **Frame:** `--frame-max-w: min(100vw, 480px)` phone-frame, centered. Owner
  console: sidebar ≥1024px, bottom pill nav below (v2 `.con/.side/.mob-nav`).
- **Gutter:** `--page-gutter: 1.25rem` via `.page-gutter` (logical padding).
- **Containers:** `full` · `reading` · `form` · `dashboard`. No per-page widths.
- **Grid:** `minmax`/`auto-fit`, responsive collapse. No fixed pixel columns.
- **Safe areas:** `env(safe-area-inset-*)` on fixed chrome, sheets, drawers.
- **Scrolling:** app scrolls normally; homepage alone is viewport-locked.
- **Fixed media frames** (`aspect-ratio` + `object-fit: cover`) — intrinsic
  dimensions never drive layout.

---

## 5. Shape, borders, elevation

- **Pill** (`rounded-full`): CTAs, chips, tags, badges, icon buttons, avatars,
  dots, switches, toasts, savebar, mobile nav.
- **Soft rects:** cards/panels `22px`, sheets `32px` top, inputs `16px`,
  slots `16px`, drawers square, tables plain. One scale, no arbitrary radii.
- **Borders:** 1px hairlines (`--line`), `--line2` for emphasis. Dashed =
  reserved/blocked semantics only.
- **Elevation:** glass blur + borders + tonal contrast. Shadows only as
  functional scrims (sheet/drawer drop shadows); decorative `shadow-*` banned.
- **Atmosphere** (brand moments only): grain (inline SVG turbulence — never
  hotlinked), vignette + beam gradients in pure CSS.

---

## 6. Motion system

Spring-led, physics-feeling, GPU-only (`transform`/`opacity`).

| Token | Value | Use |
|---|---|---|
| `--spring` | `cubic-bezier(.3,1.6,.5,1)` | presses, toggles, chips, entrances |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | fades, sheets, drawers |
| `--duration-micro` | ~150ms | hovers, presses |
| `--duration-standard` | ~240ms | panels, sheets |
| `--duration-expressive` | ~450ms | feature emphasis |

- Library: `framer-motion` (`AnimatePresence`, springs, `layoutId`, drag
  sheets) — adopted from v2; the motion-governance test allowlists it plus
  system CSS. No other animation libraries.
- Rules: layout properties never animated; lists stagger ≤50ms steps;
  `prefers-reduced-motion` kills loops/parallax/springs, keeps opacity feedback.
- Haptics pair with presses (`haptic.tap()` at call sites).

---

## 7. Z-index layers

`--z-base 0 · sticky 10 · header 40 · dropdown 50 · popover 60 · sheet 70 ·
dialog 80 · toast 90 · critical 100`. Grain/vignette sit under content;
scrims 60, sheets/drawers 61, confirms 80–81. Raw `z-index: 9999` is rejected.

---

## 8. Components (`src/components/ui/` + kit)

Kit classes in `globals.css` are the API (same names as v2): `.btn`
(`.pri/.gl/.ghost/.danger/.sm/.block`) · `.iconbtn` (44px circle, `.bare`)
· `.hd` page head · `.chip` (+`.on`) · `.badge` (+`.tone-*`) · `.pill` count
· `.field/.input/textarea/select` · `.timein` · `.sw` switch · `.seg`
segmented · `.scrim/.sheet/.drawer/.toast` · `.nail` tile · `.lk-grid/.lk`
lookbook · `.cal/.day` · `.slots/.slot` (+`.sug/.sel`) · `.tbl`
· `.dstrip/.dcell` · `.tl` timeline + `.bk` cards + `.now` · `.savebar`
· `.panel/.glass` · `.kpi` band · `.kv/.sum` rows · `.list/.row` · `.set`
drawer link · `.center` · `.empty` · `.spin` loader · `.grid2`.
Type/utility: `.h-xl/.h-l/.h-m` · `.t-s` · `.eyebrow` · `.mute/.faint/.pearl`
· `.ltr/.num` · `.page-gutter`.

Conventions:
- React wrappers (Sheet, Drawer, Toast host, Confirm, Badge, Switch, Seg,
  JalaliCalendar) compose the classes; no per-screen re-styling.
- Button: full-width CTA `min-height 52px`; loading = spinner + label.
- Input: `min-height 52px`, 16px text (no iOS zoom), focus = pearl border.
- Overlays: focus trap, Escape, backdrop dismissal, scroll lock, focus restore.
- One component per concept — no mode forks, no `Lux*` duplicates.

---

## 9. States

Common: default · hover · focus-visible · pressed · selected · disabled ·
loading · empty · error · success. Booking: available · selected · reserved ·
confirmed · in_progress · completed · cancelled · noshow (+ blocked/closed).
Data: Skeleton loading · named intentional empty states · partial · error with
retry · offline · permission (StaffGate denied card, no fake logout).

---

## 10. Screens

Customer: menu drawer · auth sheet (OTP: phone → code → name) · 4-step booking
(service → artist → time → review) · ticket receipt · my bookings (cancel
window enforced) · profile + prefs · services menu · lookbook story viewer.
Owner console: sidebar/mob-nav shell · staff login · timeline (day grid with
artist lanes + list) · schedule (week/off/engine) · services · users + roles
matrix · activity logs · settings. Homepage: frozen composition; buttons, chips
and plaques aligned to v3 tokens.

---

## 11. Responsive foundation

Targets: 375 · 390 · 430 · 768 · 1024 · 1280 · 1440 (widths), 667 · 740 ·
844 · 932 (heights). Width changes structure, height changes density. Fluid
first (`clamp/min/max/minmax/aspect-ratio/dvh/env`); media queries for
structural change only (console sidebar at 1024px, slot columns at 640px).

---

## 12. Accessibility

44px targets · visible pearl `focus-visible` ring · dialog/sheet/confirm
semantics · contrast AA on the warm palette (governance matrix) · status never
color-alone · reduced-motion support · semantic HTML, links for navigation
(`tel:`, maps, Instagram unintercepted) · RTL verified at both widths.

---

## 13. UX writing

Calm, warm, confident, concise. Primary CTA «رزرو نوبت» · errors say what
happened + how to fix · empty states honest, never fake · approved copy stays
data-driven (`salon.*` owner fields).

---

## 14. Governance

Ask first: existing token? existing component/variant? fluid system enough?
semantic color? motion purpose?
Change classes: **A** required → do · **B** safe refactor → do ·
**C** visual improvement → don't · **D** new feature → don't.

### Do / Don't
- DO use semantic tokens + kit classes. DON'T hardcode hex or invent vocabularies.
- DO use logical properties. DON'T patch with negative margins or `!important`.
- DO use `.page-gutter` and the frame. DON'T invent per-page widths.
- DO use `--z-*` layers. DON'T write raw z-index values.
- DO keep grain/beam/vignette CSS-only and local. DON'T hotlink demo assets.
- DO keep one component per concept. DON'T fork per screen.
- DO enforce permission gates server-side; UI hiding is presentation.
- DON'T render data without a backend field (no ratings, no fake states).

### QA checklist
1. `npm run check` + `npm run build` green.
2. Real browser (Edge): ~390px + ≥1280px, RTL correct, zero console errors.
3. Booking end-to-end; owner console every tab; staff roles (artist sees own lane).
4. Governance tests pass; reduced-motion spot check.
5. No `framer-motion` outside UI components; no raw durations off-token.

---

*This document derives from the code. When tokens change in `globals.css`, update this spec together.*
