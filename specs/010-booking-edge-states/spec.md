# Feature Specification: Booking Flow Error & Edge States — Design Review at 375×667

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Implemented (commit `fc3f255`), report in `docs/AUDIT-010-booking-edge-states.md`

**Input**: The booking journey's failure surfaces — the sold-out race (a slot
taken between render and submit), the closed / fully-booked day, and a network
failure mid-step — audited at the smallest supported phone viewport (375×667)
on production (`forehand.vercel.app/book`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A lost slot race is explained, never silent (P1, P5)

When two customers reach for the same slot and the server answers 409
(SLOT_TAKEN), the flow bounces the customer back to the time step and refreshes
slots. The bounce must arrive with a visible, announced explanation and the
rest of their selections intact.

**Acceptance Scenarios**:

1. **Given** a submitted slot that lost the race, **When** the server returns
   the conflict, **Then** the time step shows a Persian recovery banner with
   `role="alert"` at the top of the step.
2. **Given** the bounce, **When** the time step renders, **Then** the chosen
   service (and addons) are unchanged and no slot chip is preselected.
3. **Given** any conflict subclass (past time, day turned off, blocked time,
   outside working hours), **Then** the same banner path shows a message that
   names the reason or asks for another time.

### User Story 2 — Failures speak Persian, always (P4)

No raw browser or infrastructure error may surface in the Persian UI. Server
messages (booking/errors.ts) are Persian by contract and pass through; anything
else (network failure, HTML error page, English exception) is replaced by an
actionable Persian fallback.

**Acceptance Scenarios**:

1. **Given** the network drops between review and confirm, **When** the
   booking fails, **Then** the customer sees Persian text inviting a retry —
   never "Failed to fetch".
2. **Given** the same failure, **Then** the customer stays on the review step
   with name/phone intact and the CTA re-enabled for retry.
3. **Given** a customer cancelling a booking while offline, **Then** the
   /bookings surface also shows Persian (same sanitizer class).

### User Story 3 — Dead-end days are never offered (P1, P5)

The day strip and the month modal must agree: a day that is off (تعطیل) or
fully booked (تکمیل) is disabled in both, so a customer can never select a day
that dead-ends.

**Acceptance Scenarios**:

1. **Given** a fully-booked day within the 14-day strip, **When** the month
   modal opens, **Then** that day's cell renders muted and disabled.
2. **Given** a past day, **When** the modal renders, **Then** the cell stays
   disabled (existing behavior preserved).
3. **Given** the strip's fully-booked day, **Then** the empty state explains
   the day is full and offers the next day (verified live).

### User Story 4 — Offline guidance names the network (P5)

When OTP send/verify fails for network reasons, the message points at the
connection — not the salon's server.

**Acceptance Scenarios**:

1. **Given** an offline phone requesting an OTP, **Then** the inline error says
   the send failed and to check the internet connection.
2. **Given** the same during code verification, **Then** the verification error
   does the same.

### User Story 5 — A failed data load never lies (P5)

When the bootstrap payload returns but the salon or services payload is
missing, the booking flow's service step must show its error state with a retry
button — not "no services yet".

**Acceptance Scenarios**:

1. **Given** a bootstrap response with `salon === null` or `services === null`,
   **Then** `loadFailed` becomes true and the retry state renders.

### Edge Cases

- Double-tap on تأیید و رزرو: guarded by `isSubmittingRef` (existing).
- Slot end crossing midnight / outside working hours: guarded pre-submit with
  a Persian inline message (existing).
- A race the client's optimistic list didn't predict: handled by the 409
  bounce (this spec, Story 1).
- OTP / SMS delivery and real-DB races cannot be produced from the audit
  machine — recorded as limits; the 409 path was exercised by returning the
  server's real SLOT_TAKEN payload shape.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1**: The time step renders a `role="alert"` conflict banner fed by the
  shared `spamError` state while `step === "time"`.
- **FR-2**: Booking-write failures route through a Persian-text sanitizer:
  messages containing Persian script pass through unchanged; all others are
  replaced with `خطا در ذخیره رزرو — لطفاً دوباره تلاش کنید`.
- **FR-3**: Cancel-booking failures use the same sanitizer with a
  cancel-specific fallback.
- **FR-4**: The month modal accepts the strip's off/fully-booked date keys and
  disables those cells (muted, non-interactive).
- **FR-5**: OTP network catches produce connection-naming Persian copy.
- **FR-6**: The bootstrap adoption path sets `loadFailed` when a critical
  payload (salon or services) is missing.
- **FR-7**: Source-contract tests pin: conflict fragment coverage (server ↔
  client), 409/conflict flags, sanitizer gates, offline copy, bootstrap
  surface.

### Key Entities

- **BookingError** (`src/lib/booking/errors.ts`): code + Persian message +
  status + conflict flag; the Persian message is the client contract.
- **spamError** (booking-flow state): single source for submit/conflict
  messaging; now surfaced on both review and time steps.

## Review & Acceptance Checklist

- GATE: `npm run check` green (218 tests / 21 files at implementation).
- GATE: production probes at 375×667 re-run post-deploy (banners, contrast,
  empty states, error copy).
- GATE: no non-Persian text reachable in customer error surfaces.

## Execution Status

- [x] User stories drafted from live probes
- [x] FRs mapped to commits (`fc3f255`)
- [x] Tests written and green
- [x] Deployed and live-verified
