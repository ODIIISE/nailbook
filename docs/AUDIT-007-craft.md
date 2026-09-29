# Craft Pass — Phase 10 (Motion · Icons · Mobile-Native)

**Commits**: fixes `640845c` · this report
**Spec**: `specs/007-craft/spec.md`
**Method**: mechanical sweeps + code reading. The Emil Kowalski skill checklists
(`.agents/skills/review-animations`, `mobile-native`) are access-blocked in this
environment; the repo's own `motion-governance.test.ts` (which encodes design
system §20–22), the UI Constitution P8, and AGENTS.md served as checklists.

## Verdict — the app passes its own governance

The motion-governance test (motion only in tokens/editorial/primitives; no
framer-motion/tw-animate-css/View Transitions) is green and the sweeps confirm
it in practice:

| Sweep | Result |
|---|---|
| `transition-all` outside landing | **0** |
| `animate-spin/pulse/bounce/ping` outside landing | **0** |
| Raw Tailwind durations outside sanctioned zones | **1 → 0** (fixed) |
| CSS raw durations in globals.css | only the reduced-motion 0.01ms reset |
| `will-change` misuse | 0 |

Homepage motion (splash, parallax, tilt, slideshow, badge spin) was already
audited in Phase 5b: all entrance/exit choreography is transform/opacity,
badge spin is reduced-motion-gated (accepted deviation), slideshow becomes an
instant change under reduced-motion.

## Findings & Fixes (commit `640845c`)

| # | Severity | Principle | Finding | Fix |
|---|---|---|---|---|
| 1 | LOW | P8 | Timeline booking block: `transition-transform duration-150` with **nothing that transforms** — a dead transition and the only raw duration outside sanctioned zones | Removed; focus ring (state feedback) untouched |
| 2 | LOW | P2 | Booking-modal close: hand-rolled inline X `<svg>` next to lucide everywhere else | lucide `X` |
| 3 | INFO | P2 | Two icon libraries: 45 files lucide, 13 imports `@heroicons` — all in the owner bottom navbar as **outline/solid active-tab pairs** | **Sanctioned exception** — lucide has no filled variants; degrading the native tab pattern to satisfy one-set purity would lose real state affordance. Documented in the inventory. Same rationale covers booking-flow's filled sparkle marker |
| 4 | INFO | P8 | The remaining `transition-shadow` on timeline blocks pairs with a real `hover:shadow-card` | Legitimate — no change |

## Mobile-native audit (no fixes needed — verified present)

- **Safe areas**: header `paddingTop: env(safe-area-inset-top)`, navbar
  `paddingBottom: env(safe-area-inset-bottom)`, `viewportFit: "cover"` in the
  root viewport export; homepage footer adds `--safe-b`.
- **iOS focus-zoom**: inputs/selects are `md:text-sm` — 16px base on phones,
  shrinking only ≥768px → no auto-zoom on focus.
- **Haptics**: `haptic.tap/success/warning` used across 7 surfaces incl.
  navbar, booking flow, owner actions; no-op where unsupported (iOS Safari).
- **Scroll**: `overscroll-contain` on every scroll container; homepage swipe
  handler explicitly refuses to hijack vertical scroll (|dx| vs |dy|×1.5 gate).
- **Touch**: 44px floor enforced since Phase 0; `.tap-44` hit-expansion for
  small visual buttons (Phase 8).
- **Viewport**: no `user-scalable=no` (pinch-zoom stays available — a11y).

## Verification

- `npm run check` green (lint + tsc + 169/169) at `640845c`, including the
  three motion-governance tests themselves.
- Icon sweep re-run post-fix: inline SVGs outside landing/ui = booking-flow's
  sanctioned sparkle only.
- Pushed to `main` → Vercel.

## Roadmap position

Phases 0–10 complete. Remaining: **Phase 11** (hardening: viewport matrix,
dark mode, WCAG AA floor, performance).
