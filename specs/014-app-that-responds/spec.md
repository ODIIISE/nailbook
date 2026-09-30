# Feature Specification: App That Responds — Atelier Motion + Toast Diet

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-30

**Status**: Implemented (commit `5dbc0df`), report in `docs/AUDIT-014-app-that-responds.md`

**Input**: Emil Kowalski's interaction principles applied to Nailbook's
existing motion system: press-ability (every tap needs an instant visual
twin), direction as spatial meaning (forward/back slide from opposite edges),
state animation (changes cross-fade, not snap), perceived speed (staggered
reveals), and honest feedback (toasts only for what the UI cannot show).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Every tap acknowledges instantly (P5, P8)

Interactive elements show a pressed state the moment the finger lands —
paired with the haptic twin the app already fires — so taps never feel dead
and double-taps lose their motivation.

**Acceptance Scenarios**:

1. **Given** any `.pressable` element, **When** pressed, **Then** it scales
   to 0.98 with a 150ms token ease and slightly dips opacity.
2. **Given** large surfaces (`.pressable-soft`), **Then** the scale dip is
   gentler (0.995) so cards don't visually sink.
3. **Given** `prefers-reduced-motion`, **Then** the transform is dropped and
   only the opacity feedback remains (P8: reduce movement, keep feedback).
4. **Given** a disabled element, **Then** no pressed state fires.

### User Story 2 — Direction tells you where you are (P1, P8)

The booking flow's steps slide from the edge matching travel direction:
forward enters from the inline-start edge (RTL-aware), back from the other —
including the sold-out conflict bounce, which must read as "going back".

**Acceptance Scenarios**:

1. **Given** advancing service → time → review, **Then** each step enters
   with `step-enter-fwd` (240ms, `--ease-standard`).
2. **Given** tapping back, **Then** the step enters with `step-enter-back`.
3. **Given** a server conflict bouncing time-ward, **Then** the transition
   animates as a back navigation (routed through `goTo`).

### User Story 3 — State changes are felt (P1, P8)

The owner timeline — the watched surface — cross-fades status pills, pulses
its now-dot, staggers the day's cards on load, and responds to presses.

**Acceptance Scenarios**:

1. **Given** a status flip or paid toggle, **Then** the pill cross-fades
   (150ms) instead of snapping.
2. **Given** a day with bookings rendering, **Then** cards reveal with a
   40ms/item stagger (capped at 6 steps).
3. **Given** the now-line, **Then** its dot pulses quietly (2.4s loop,
   disabled under reduced motion).

### User Story 4 — Toasts only say what the screen can't (P1)

A success toast may exist only when the outcome is not already visible.
Twenty-three redundant confirmations are removed; fifteen remain where the
toast is the sole messenger (downloads, share results, counts, preserved
drafts).

**Acceptance Scenarios**:

1. **Given** the cut list (schedule saved, block added, login success,
   settings saved, …), **Then** no toast fires for those outcomes.
2. **Given** the kept list (receipt download, share result, export count,
   drafts preserved), **Then** those toasts still fire.

### Edge Cases

- Reduced-motion users keep opacity feedback; transforms and loops are off.
- Stagger is capped (max 6 × 40ms) so long lists never feel slow.
- Governance: all motion lives in the system layer (globals.css); the
  motion-governance test now excludes contract-test files (which quote CSS
  in assertions) but continues to ban animation libraries and raw durations.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1**: globals.css defines `.pressable`, `.pressable-soft`,
  `.step-enter-fwd/back`, `.reveal-item` (+`--stagger-i`), `.state-fade`,
  `.now-pulse` — token-driven, transform/opacity only.
- **FR-2**: Reduced-motion overrides drop transforms/loops, keep opacity.
- **FR-3**: Booking flow tracks step direction in state (never ref-read in
  render) and applies the matching class on each active section.
- **FR-4**: Timeline applies `reveal-item pressable-soft` + stagger index,
  `state-fade` on both status-pill variants, `now-pulse` on the dot.
- **FR-5**: The conflict bounce routes through `goTo` (direction + message
  state in one call).
- **FR-6**: 23 success toasts removed per the only-messenger classification;
  contract tests pin both the cuts and the keeps.

## Review & Acceptance Checklist

- GATE: `npm run check` green (236 tests / 21 files).
- GATE: live production check at 375×667 (press classes in markup, step
  slide, stagger) after Vercel deploy completes.
- GATE: motion-governance suite stays green with the new layer.

## Execution Status

- [x] Motion system designed within existing tokens (no new durations)
- [x] FRs mapped to commit `5dbc0df`
- [x] Tests written and green (236/236)
- [x] Deployed; live verification pending deploy propagation
