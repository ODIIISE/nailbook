# Forehand Nail Studio — Design System

> Clean Slate — a monochrome, mobile-first, Persian-first booking system with compact geometry and native-feeling surfaces.

This document describes the implementation source of truth in `src/app/globals.css`, `src/lib/design-tokens.ts`, and the shared UI primitives. It intentionally supersedes the older paper-blue exploration.

---

## 1. Product and visual principles

- **Persian-first:** natural RTL composition, Persian copy, Jalali dates, and Persian/Arabic digit support.
- **Clean Slate:** near-black and cool-neutral surfaces create a calm, editorial salon feel.
- **One primary action:** booking is the dominant action; contact and navigation stay subordinate.
- **Content over chrome:** real salon imagery, services, and availability carry the experience.
- **Native-feeling interaction:** compact sheets, predictable back/close behavior, tactile feedback, and purposeful motion.
- **Accessible by default:** visible focus, semantic labels, minimum 44px interactive targets, reduced-motion support, and AA contrast targets.
- **Mobile first:** the customer journey is designed around narrow portrait screens, then scales to larger widths.

---

## 2. Source of truth

| Layer | Source |
|---|---|
| Primitive and semantic CSS tokens | `src/app/globals.css` |
| Service/timeline palette helpers | `src/lib/design-tokens.ts` |
| Shared button/card/sheet behavior | `src/components/ui/` |
| Customer homepage composition | `src/app/page.tsx` and `src/components/landing/` |
| Booking flow | `src/app/book/content.tsx` and `src/components/booking/` |
| Persian product and interaction guidance | `PRODUCT.md` and `AGENTS.md` |

Do not add raw color or radius values to new components when an existing semantic or component token is available.

---

## 3. Typography

- **Family:** Vazirmatn, with system fallbacks.
- **Display:** `.text-display` — 34px, 800, 1.08 line-height.
- **H1:** `.text-h1` — 24px, 700, 1.2 line-height.
- **H2:** `.text-h2` — 20px, 700, 1.25 line-height.
- **H3:** `.text-h3` — 17px, 600, 1.3 line-height.
- **Body:** `.text-body` — 15px, 1.55 line-height.
- **Caption:** `.text-caption` — 13px, 500, 1.4 line-height.

Keep body copy readable, wrap Persian text naturally, and use `dir="ltr"` for phone numbers, times, and other directional numeric values.

---

## 4. Color tokens

### Light theme

| Token | Value | Purpose |
|---|---|---|
| `--background` | `#FFFFFF` | Page canvas |
| `--foreground` | `#0A0A0A` | Primary text and primary action |
| `--card` | `#FFFFFF` | Elevated content surfaces |
| `--secondary` / `--muted` | `#F5F5F5` | Quiet surfaces and secondary controls |
| `--muted-foreground` | `#525252` | Secondary text with AA contrast |
| `--border` | `#E5E5E5` | Dividers and control boundaries |
| `--success` | `#16A34A` | Positive status |
| `--destructive` | `#DC2626` | Error and destructive actions |

### Dark theme

| Token | Value | Purpose |
|---|---|---|
| `--background` | `#000000` | Page canvas |
| `--foreground` | `#FAFAFA` | Primary text and primary action |
| `--card` | `#0F0F10` | Elevated content surfaces |
| `--secondary` / `--muted` | `#171717` | Quiet surfaces and secondary controls |
| `--muted-foreground` | `#B5B5B5` | Secondary text with strong contrast |
| `--border` | `#262626` | Dividers and control boundaries |
| `--success` | `#34D399` | Positive status |
| `--destructive` | `#F87171` | Error and destructive actions |

Use `var(--primary)` / `var(--foreground)` for the main action rather than introducing unrelated accent colors. Functional status colors must be paired with text or icon meaning, not color alone.

---

## 5. Radius and geometry

The global scale stays compatible with the existing application. New booking surfaces use their own tighter component tokens so this refinement does not unexpectedly reshape owner screens, authentication, or the calendar.

| Token | Value | Use |
|---|---:|---|
| `--radius-sm` | 10px | Small controls and compact elements |
| `--radius-md` | 14px | Cards, inputs, and standard grouped surfaces |
| `--radius-lg` | 18px | Larger grouped surfaces |
| `--radius-xl` | 24px | Modals and large surfaces |
| `--radius-3xl` | 32px | Large containers |

### Booking component tokens

| Token | Value | Use |
|---|---:|---|
| `--radius-booking-cta` | 14px | Homepage booking surface |
| `--radius-booking-item` | 10px | Service option and booking button |
| `--radius-booking-icon` | 8px | Thumbnail and icon tile |
| `--radius-sheet` | 14px | Service-selection sheet top corners |
| `--radius-sheet-handle` | 999px | Sheet drag handle |
| `--booking-sheet-scrim` | 42% black light / 56% black dark | Sheet backdrop |

Prefer these semantic tokens over one-off `rounded-[...]` values in booking UI.

---

## 6. Elevation and motion

- `--shadow-xs`: subtle button/control lift.
- `--shadow-card`: resting cards and booking surfaces.
- `--shadow-elevated`: active or layered surfaces.
- `--shadow-floating`: sheets, menus, and fixed navigation.
- `--dur-fast`: 140ms for press feedback.
- `--dur-base`: 200ms for normal transitions.
- `--dur-slow`: 320ms for larger transitions.
- `--ease-spring-decay`: sheet entrance and spatially continuous movement.

Motion should communicate cause and effect. Sheets enter from the bottom, close faster than they enter, and disable motion under `prefers-reduced-motion`.

---

## 7. Homepage booking CTA and service sheet

The customer homepage presents the salon identity, highlights, trust/contact information, then one clear booking surface. The CTA does not dump the customer into a long service list immediately.

### Booking CTA

- Outer radius: `--radius-booking-cta`.
- One concise explanation and one primary `رزرو نوبت` action.
- Located directly after contact actions in the homepage flow.
- Uses the shared foreground/background action contrast in both themes.
- Opens the service picker as a bottom sheet with `aria-haspopup="dialog"` and `aria-expanded` state.

### Service-selection sheet

- Shows only active services in owner-defined `sort_order`.
- Includes service image when available, service name, duration, and price.
- Uses compact 10px service-row geometry and 8px thumbnail geometry.
- Shows a skeleton while salon services load and an explicit empty state when none are active.
- Selecting a service closes the sheet, then routes to `/book?service={id}` after the close transition completes.
- Supports backdrop click, Escape, swipe-down from the drag handle, close control, focus trapping, body-scroll locking, and focus return to the trigger.
- Uses `max-height: min(88dvh, 680px)` so long service lists remain scrollable without trapping the page.

### Interaction states

| State | Treatment |
|---|---|
| Rest | Card surface, border, subtle card shadow |
| Hover | Slight border/surface emphasis on pointer devices |
| Pressed | Small transform feedback without layout shift |
| Loading | Reserved skeleton rows |
| Empty | Helpful message and recovery guidance |
| Focused | Visible ring with semantic ring token |
| Disabled | Reduced opacity and no pointer interaction |

---

## 8. Shared components

### Buttons

The shared `Button` primitive supports default, outline, secondary, ghost, link, destructive, and paper-compatible variants. Booking CTA buttons use compact geometry and semantic foreground/background tokens when the surface requires a rectangular editorial treatment.

### Cards

Cards use `bg-card`, `border-border`, and the shadow scale. Avoid nesting cards without a clear hierarchy. Use a border or a shadow intentionally; do not layer several competing elevation treatments.

### Bottom sheets

Use `BottomSheet` for focused mobile tasks that benefit from preserving page context, such as service selection, manual booking, or block-time entry. Every sheet needs a visible title, close route, Escape handling, backdrop dismissal, and a clear scroll boundary.

---

## 9. Navigation and safe areas

- Customer bottom navigation has no more than five top-level destinations and includes text labels.
- Fixed navigation reserves safe-area space with `env(safe-area-inset-bottom)`.
- Sticky headers reserve top safe-area space.
- Back behavior must preserve the booking state and use the same spatial direction across the flow.

---

## 10. Quality checklist

Before shipping a visual change:

- Check 375px, 390px, and desktop widths.
- Check light and dark themes independently.
- Check Persian wrapping and LTR phone/time values.
- Confirm all primary targets are at least 44px tall/wide.
- Confirm keyboard focus and Escape behavior for sheets.
- Confirm reduced motion removes non-essential animation.
- Run lint, TypeScript, tests, production build, and the Impeccable detector for changed UI files.
