# Feature Specification: Booking Success Screen & Printed Receipt — Design Review

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Implemented (commit `6efb579`), report in `docs/AUDIT-009-success-receipt.md`

**Input**: The one journey moment no roadmap phase audited closely: the
confirmation step (success receipt, calendar actions, share/download, rebook)
and the printed receipt artifact (also used as the review-step پیش‌فاکتور and
rendered by the shareable `/bookings/[id]` page).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One code to rule them all (P1)

The customer sees exactly one tracking code for their booking, identical on
the success receipt, the bookings list, the profile, and the shareable receipt
page — correlating a support question ("نوبتم با کد BK-…") must work.

**Acceptance Scenarios**:

1. **Given** a booking, **When** its code is shown on any surface, **Then** it
   is the same last-6 alphanumeric run (with or without the BK- prefix by
   surface convention).
2. **Given** the printed receipt header, **When** rendered, **Then** the
   header code matches the reference line on the same receipt.

### User Story 2 — The artifact reads like print (P2)

The receipt is a designed artifact: itemized lines, totals, Jalali date with
correct bidi ordering, QR to the shareable page, salon identity — all token-
colored, AA-compliant, and capture-safe (html-to-image with fonts ready).

**Acceptance Scenarios**:

1. **Given** informational text on the receipt, **Then** ≥4.5:1 in both
   themes (no decorative-alpha on real text).
2. **Given** the date/time row, **Then** Persian reading order survives bidi
   (isolated numeric runs) — verified in code, preserved.

### User Story 3 — Exit actions never dead-end (P3)

Calendar (ICS + Google), share (file → text → clipboard+download chain),
download, rebook, and "my bookings" all work or explain; capture states
disable the buttons consistently.

## Requirements

- **FR-001**: Tracking code MUST be uniform (last-6) across all surfaces (P2).
- **FR-002**: Receipt text MUST pass AA in both themes (P6).
- **FR-003**: Existing receipt craft (bidi isolation, QR fallback, share
  chain, snapshot pricing) MUST be preserved (P3).

## Success Criteria

- **SC-001**: Zero cross-surface code mismatches; zero garbled ids.
- **SC-002**: `npm run check` green at the fix commit.
- **SC-003**: Findings recorded in `docs/AUDIT-009-success-receipt.md`.
