# App That Responds — Atelier Motion + Toast Diet (post-roadmap)

**Commit**: `5dbc0df` (spec: `specs/014-app-that-responds/spec.md`)
**Lens**: Emil Kowalski's interaction principles — press-ability, direction
as space, state animation, perceived speed, honest feedback.
**Surfaces**: globals.css (system layer), booking-flow (steps + controls),
owner timeline, toast call sites across 10 files, motion-governance test.
**Discovery that shaped the plan**: the design system already defined a
complete motion vocabulary (`--duration-micro/standard`, `--ease-standard/
spring`, reduced-motion handling) with **zero usages** in app code — the
"motion-free" rule was really "motion never wired". This pass activates it.

## What shipped

| # | Phase | Principle | Change |
|---|---|---|---|
| 1 | **Press twins** | P5, P8 | `.pressable` (scale 0.98 + opacity dip, 150ms token ease) on CTA, slot chips, day chips, addon rows; `.pressable-soft` (0.995) on large cards. Pairs with the existing haptic calls — the physical and visual twins now land together. Disabled elements exempt. |
| 2 | **Directional steps** | P1, P8 | Booking flow tracks travel direction in state; forward enters from inline-start (RTL-aware 24px slide + fade, 240ms `--ease-standard`), back from the opposite edge. The sold-out conflict bounce now routes through `goTo`, so it reads as a *back* navigation instead of a teleport. |
| 3 | **Timeline life** | P1, P8 | Status pills cross-fade on flip (`.state-fade`), the now-dot pulses quietly (`.now-pulse`, 2.4s, off under reduced motion), the day's cards reveal with a 40ms stagger (capped at 6), cards press softly. |
| 4 | **Perceived speed** | P1 | Service cards on booking step 1 reveal staggered like the timeline — a set rendering in sequence reads faster than a wall appearing. |
| 5 | **Toast diet** | P1 | **23 redundant success toasts cut** (schedule saved, block added/removed, manual booking created, cancellations, settings/logo/image saves, admin login/bootstrap/migrate/salon CRUD, profile updates) — the UI already shows every one of those outcomes. **15 kept** where the toast is the only messenger: receipt downloads, share results, export counts, backups, welcomes, the preserved-drafts notice. |

## Discipline kept (P8)

- Every new class is **token-driven** (`--duration-micro/standard`,
  `--ease-standard`) — no new durations or easings invented.
- Transform/opacity only (compositor-friendly, no layout thrash).
- **Reduced-motion**: transforms and loops are disabled; opacity feedback
  stays. Movement is reduced, acknowledgment is not.
- No animation libraries introduced; the motion-governance suite stays
  green (updated to exclude contract-test files, which quote CSS strings in
  assertions — a test artifact, not UI motion).
- **Decision record**: the previous "Atelier stays motion-free" note is
  superseded by this governed layer — motion now exists only through system
  classes defined in globals.css, exactly the grammar the constitution's P8
  anticipated.

## Verified

- `npm run check`: **236/236** (4 new contract tests pin the system classes,
  direction wiring, stagger/fade/pulse usage, and the toast cuts/keeps).
- Linter caught a real anti-pattern during build (ref read in render for
  direction) — fixed with state before it could ship.

## Honest limits

- **Press feel is subjective until your thumb says so** — the 0.98 dip is
  the industry-standard value, but the phone walk is the judge.
- **Live production verification done** on the deployed build at 375×667:
  staggered service cards fire  at 0/40/80/120ms, the time step
  enters with  at 240ms on the governed  curve,
  back navigation flips to , 20 press-twin elements are live,
  and the header buttons hold their 44px minimum. Feel judgment (does 0.98
  read right?) still belongs to the phone walk.
- Step transitions animate the entering layer only (the outgoing layer
  stays a cross-fade under it) — a matched exit pair would need the
  absolute layers to coordinate; noted as a future refinement, not a gap.

## Classification record — toast diet

**Cut (23)**: profile name/phone updates, booking cancellation (customer ×2,
owner), block added/removed, manual booking created, admin login, admin
bootstrap created, migrations run, salon created/deployed, admin manager
created, admin salon saved, owner schedule saved, owner settings saves
(logo, profile image, splash logo, general, hero background), image/logo
deletions.
**Kept (15)**: receipt download, share result, copy result, export count,
import identified/completed, backup download, restore count, owner welcome,
customer welcome, drafts preserved, gallery image saves (per-image feedback
in a loop).
