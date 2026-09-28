# Feature Specification: Booking Journey UX — Audit & Polish

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-28

**Status**: Audit phase → fixes gated on designer approval

**Input**: Designer directive: improve the customer booking journey end-to-end
without breaking business logic (slot engine, Jalali dates, OTP auth, atomic
booking). Homepage included in scope (freeze lifted).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — First-time customer books without help (P1)

A Persian-speaking customer who has never seen the app opens `/book` from the
homepage and completes a booking: service → addons → date → time → phone+OTP →
name → confirm → success, then finds the booking again in `/bookings`.

**Why this priority**: This is the revenue path; every dropped user is lost income.

**Independent Test**: Walk the flow in a real browser at 390×844 with no
prior context and complete a booking without instruction. (Audit uses a
test salon with SMS disabled — no real verification messages are sent.)

**Acceptance Scenarios**:

1. **Given** the service step, **When** a service is tapped, **Then** selection is visually unambiguous (checked radio + border) and the sticky CTA reflects the running total.
2. **Given** the time step, **When** the selected service+addons leave today fully booked, **Then** the strip auto-anchors to the first open day instead of dead-ending.
3. **Given** the review step, **When** OTP is required, **Then** the user can complete it inline without losing their selections.
4. **Given** a slot is taken mid-flow (sold-out race), **When** the user confirms, **Then** they land back on time step with a clear message and their other choices intact.
5. **Given** booking success, **When** the user taps done, **Then** the new booking is findable in `/bookings` with correct Jalali date, price snapshot, and tracking code.

### User Story 2 — Customer manages a booking (P2)

A returning customer opens `/bookings`, opens a booking's detail sheet,
understands every field at a glance, and can cancel with confidence (inline
confirm; failure keeps the sheet open with rolled-back status).

**Why this priority**: Post-booking anxiety (did it save? can I cancel?) drives
support contacts.

**Independent Test**: Open a booking detail, verify field comprehension and the
cancel path (fail-safe behavior preserved).

**Acceptance Scenarios**:

1. **Given** the detail sheet, **When** opened, **Then** service/date/time/price/status are identifiable without reading labels twice.
2. **Given** cancel fails server-side, **When** the request errors, **Then** the sheet stays open, status rolls back, and an error toast explains next steps.

### User Story 3 — Trust on first contact (P3)

Before booking, the customer judges trust from the homepage + portfolio:
salon identity, real photos, clear price/time expectations.

**Why this priority**: Pre-booking drop-off happens here; polish pays but is not revenue-blocking.

**Independent Test**: 5-second glance test on homepage at 390×844: can a new
user say what this business is and how to book?

**Acceptance Scenarios**:

1. **Given** the homepage loads, **When** a user glances for 5 seconds, **Then** salon name, service category, and a booking CTA are identifiable.

### Edge Cases

- Salon with **no services** → service step shows an intentional empty state, not a blank page.
- Salon closed today / all days off → time step explains why, never a bare empty grid.
- Slot taken mid-flow (sold-out race) → covered in US1.4.
- Owner reprices/deletes a service after booking → price snapshot preserved (existing rule; UI must not contradict it).
- OTP resend spam → cooldown respected; double-submit guarded.
- Deep link `/book?look=Y&service=X` with stale service → banner still shows the look; user picks any live service.

## Requirements *(mandatory)*

### Functional Requirements (audit-phase: these are the verification targets)

- **FR-001**: The flow MUST maintain selection state across steps and failed verification (no lost service/addons/date/time).
- **FR-002**: Every screen in the journey MUST have designed states: loading, empty, error, selected, disabled — no blank boxes (Constitution P5).
- **FR-003**: Progress MUST be visible (step kicker + progress bar) and back behavior predictable (RTL arrow, `nailbook:back` event).
- **FR-004**: All text MUST be Persian with Persian digits; times/phones/tracking codes `dir="ltr"` (Constitution P4).
- **FR-005**: Error messages MUST say what happened and what to do next (no raw codes, no dead ends).
- **FR-006**: Touch targets MUST be ≥44px; hover must not be the only selection affordance (Constitution P5).
- **FR-007**: Any motion added MUST pass the review-animations gate (Constitution P8); removed motion MUST NOT remove feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of journey screens have designed loading/empty/error states in the inventory (docs/UI-INVENTORY.md) and in the browser.
- **SC-002**: Zero L1 findings (unreadable state/next-step) remain open after the fix phase.
- **SC-003**: All critical/high findings fixed and verified at 375×667, 390×844, 430×932, ≥1280 desktop with RTL intact.
- **SC-004**: `npm run check` (lint + tsc + 169 tests) green after every fix commit.
- **SC-005**: Before/after screenshot pairs exist for every visual fix.

## Assumptions

- Audit runs against a local dev server with a test salon; **SMS OTP is not sent** (no real verification messages); no real bookings are created during the audit (submit is not triggered, or test data is cleaned).
- Slot engine, atomic booking API, and snapshot pricing are correct and out of scope.
- The designer approves fixes before implementation; findings are advisory until then.

## Dependencies

- `docs/UI-INVENTORY.md` (state matrix source)
- `.specify/memory/constitution.md` (finding severity rules)
- AGENTS.md browser workflow (Playwright via `channel="msedge"`)
