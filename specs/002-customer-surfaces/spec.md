# Feature Specification: Customer Surfaces — Audit & Unification

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Fixes approved (plan mode), implementing

**Input**: Phase 6 of the UI roadmap: customer surfaces after the booking journey
(`/bookings` + detail sheet, `/profile`, `/portfolio`, `/login`). Audit method:
full code review of all four surfaces + runtime probes of public-reachable
states on production (forehand.vercel.app, designer-authorized).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One status language everywhere (P1)

A customer sees a booking's status ("ثبت شده", "تأیید شده", "در حال انجام",
"انجام شده", "لغو شده") on the bookings list, on their profile recents, and on
the shareable receipt page. The same status always looks and reads the same:
same label, same colors, same dot markup.

**Why this priority**: Contradictory status colors on the same data (completed
was green on the receipt, gray on lists) break trust in the record — this is
the customer's evidence of what they booked.

**Independent Test**: Grep for `STATUS_MAP` — exactly one definition exists;
every surface imports it. Visual: the same booking renders identical pills on
all three surfaces.

**Acceptance Scenarios**:

1. **Given** any surface rendering a status pill, **When** inspected, **Then**
   markup, label, and colors come from `src/components/ui/status-pill.tsx`.
2. **Given** the "در حال انجام" status, **When** rendered in light or dark
   mode, **Then** colors resolve from the `--warning` token — no raw Tailwind
   palette colors.
3. **Given** the "انجام شده" status, **When** rendered on any surface, **Then**
   it is neutral (green is reserved for "تأیید شده").

### User Story 2 — Profile cards behave for keyboard and screen readers (P2)

On `/profile`, each recent booking card has independent, correctly nested
controls: one for opening the full bookings list and one for cancelling.
No pseudo-button wrappers around real buttons.

**Why this priority**: A `role="button"` div containing a real button is
announced as "button, button" and produces broken keyboard order — an
accessibility defect at the heart of the cancel flow.

**Independent Test**: Tab through a profile booking card: each control is a
real button in DOM order; activating مشاهده navigates; activating لغو starts
the inline confirm without navigating.

**Acceptance Scenarios**:

1. **Given** a recent booking card, **When** traversed by screen reader or
   keyboard, **Then** no nested-interactive violation exists.
2. **Given** the card container, **When** clicked, **Then** nothing happens
   (navigation moved to the explicit مشاهده button).

### User Story 3 — Persian-first chrome (P3)

All UI chrome on customer surfaces is Persian. Brand wordmarks (Forehand,
NAILBOOK) may remain Latin as intentional brand voice (same class as the
homepage wordmark) — but generic section labels must not be English.

**Independent Test**: Sweep customer surfaces for Latin text in non-brand
roles; none remain.

**Acceptance Scenarios**:

1. **Given** the bookings page history card, **When** read, **Then** the
   kicker is `تاریخچه`, not `HISTORY`.

### Edge Cases

- Unknown status value from the server → pill falls back to "در انتظار" neutral styling.
- Bookings list logged-out → login CTA card (verified correct).
- Booking with repriced/deleted service → snapshot price shown (verified correct, migration 022).
- Cancel failure → sheet stays open with rolled-back status + error toast (verified correct).
- Portfolio with zero looks → intentional empty state (verified correct).

## Requirements *(mandatory)*

### Functional Requirements (audit-phase: verification targets)

- **FR-001**: Status pills MUST have a single definition consumed by
  `/bookings`, `/profile`, and `/bookings/[id]` (Constitution P2).
- **FR-002**: Status colors MUST use design tokens only — no raw Tailwind
  palette colors (Constitution P2).
- **FR-003**: No interactive element MAY be nested inside another interactive
  element (Constitution P5).
- **FR-004**: Persian-first text everywhere except brand wordmarks (Constitution P4).
- **FR-005**: Existing correct behaviors (logged-out states, empty states,
  snapshot pricing, cancel fail-safety, polling, focus trap) MUST be preserved
  (Constitution P3).

## Success Criteria *(mandatory)*

- **SC-001**: Exactly one `STATUS_MAP` in the codebase; zero raw palette colors in status rendering.
- **SC-002**: axe-style check: zero nested-interactive violations on `/profile`.
- **SC-003**: `npm run check` (lint + tsc + tests) green after every commit.
- **SC-004**: Public-reachable states verified on production at 375×667 / 390×844 / 430×932 with RTL intact.
- **SC-005**: Findings, decisions, and before/after recorded in `docs/AUDIT-003-customer-surfaces.md`.

## Assumptions

- Authenticated flows (bookings with data, detail sheet, profile edits) are
  verified by code review + existing tests; real OTP login requires the SMS
  arriving on the designer's phone and is out of reach from the audit machine.
- Slot engine, cancel API, and snapshot pricing remain out of scope.

## Dependencies

- `docs/UI-INVENTORY.md` (state matrix source)
- `.specify/memory/constitution.md` (severity rules)
- `docs/AUDIT-001-booking-journey.md` (login fixes already shipped)
