# Feature Specification: Owner Day-Of Loop — Timeline, Calendar, Shared Chrome

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-30

**Status**: Implemented (commit `bd2a2ac`), report in `docs/AUDIT-013-owner-day-loop.md`

**Input**: The screen the owner opens every working day — the `/owner`
dashboard with its timeline, day strip, stats, and booking/status modals —
plus the shared header chrome present on every page. Prior audits touched
these only in passing (AUDIT-005).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Overlapping bookings stay separate cards (P1, P5)

When two appointments overlap (walk-in + online, or a delay), the timeline
splits lanes — and the cards must remain visibly separate and independently
tappable.

**Acceptance Scenarios**:

1. **Given** two overlapping bookings, **When** rendered, **Then** each card
   keeps a visible seam (≥ a few px of background between them).
2. **Given** any overlap, **Then** both cards remain individually tappable
   with a 44px-minimum effective target.
3. **Given** a compact lane (height < 64px), **Then** the status pill, price,
   and payment state stay readable or truncate honestly.

### User Story 2 — The owner's calendar agrees with itself (P1, P2)

The owner's day strip disables fully-booked days, the customer's strip
disables fully-booked days — the owner's month modal must follow the same
grammar, and an in-progress selection must survive accidental interaction.

**Acceptance Scenarios**:

1. **Given** a fully-booked day in the strip, **Then** its chip is disabled
   (visual + `disabled` attribute), matching the customer strip.
2. **Given** the month modal open, **When** the owner taps the backdrop,
   **Then** the dialog stays open (closing is a decision: بستن or Escape).
3. **Given** past days in the modal, **Then** they stay visibly muted and
   disabled (opacity preserved; contrast governed by the muted token).

### User Story 3 — Every icon button meets the touch minimum (P5)

The 32px `icon-sm` size — used by the shared header theme/menu buttons, every
dialog/sheet close button, and owner row actions — violates the 44px minimum.

**Acceptance Scenarios**:

1. **Given** the `--btn-sm` token, **Then** it resolves to 44px so every
   `icon-sm` consumer is compliant at once (P2: token-level fix, not a
   class-by-class sweep).
2. **Given** the shared header on any page, **Then** the theme toggle and
   menu button measure ≥ 44px.

### Edge Cases

- The "now" line anchored to midnight (`00:00`): self-corrects via the 10s
  owner polling re-render (minutes update without a page reload) — verified,
  not a bug.
- Deleted services in the timeline: name snapshot keeps cards readable;
  prices fall back to the creation-time total — verified correct.
- Unpaid-strip vs earnings-card numbers: consistent scopes (day bookings vs
  paid-in-window accounting) — verified correct, kept.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1**: Timeline lane layout subtracts a per-card seam
  (`LANE_SEAM_PX = 4`, both edges) when `laneCount > 1`.
- **FR-2**: `JalaliCalendar` strip disables `isFullyBooked && !isSelected`
  chips.
- **FR-3**: `CalendarModal` backdrop does not close the dialog; only the
  بستن button or Escape does.
- **FR-4**: Past modal cells stay muted (`text-muted-foreground`) with the
  opacity removed (contrast is token-governed; the extra `opacity-30` was a
  double-dip).
- **FR-5**: `--btn-sm: 44px` (all `icon-sm` consumers inherit compliance).
- **FR-6**: Contract tests pin: seam constant + no shared-edge regression,
  strip disabled state, backdrop behavior, token value, timeline a11y labels.

## Review & Acceptance Checklist

- GATE: `npm run check` green (232 tests / 21 files at implementation).
- GATE: header button sizes verified live on production at 375×667.
- GATE: timeline overlap rendering requires a real owner session
  (designer phone-walk item; geometry pinned by tests).

## Execution Status

- [x] Day-of loop code-reviewed end to end (dashboard, timeline, modals)
- [x] Shared chrome audited on live production (375×667)
- [x] FRs mapped to commit `bd2a2ac`
- [x] Tests written and green; deployed
