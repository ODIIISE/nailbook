# Feature Specification: Owner Tools — Audit & Polish

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Implemented (commit `4f982fe`), report in `docs/AUDIT-005-owner-tools.md`

**Input**: Phase 8: owner tools (dashboard timeline, schedule, services, users,
settings, activity, highlights) audited for consistency, density, and the
owner-task flow. Density is a feature in this area; the lenses are owner-task
efficiency, token consistency, and touch targets (owners work on phones too).
Method: code review (owner OTP requires the owner's phone; recorded as a limit).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Every control tells the truth (P1)

The owner never fills in a field the app silently discards, and never taps a
control the app cannot act on.

**Acceptance Scenarios**:

1. **Given** the block-time sheet, **When** submitted, **Then** every collected
   field reaches the store (reason removed until the schema supports it).
2. **Given** any owner control, **When** rendered disabled, **Then** it stays
   readable (no opacity fades).

### User Story 2 — Dense but tappable (P2)

The timeline and schedule stay information-dense (96px/hour, 48px blocks) while
every interactive element meets the 44px floor — small visual size is fine when
the hit area is expanded invisibly.

**Acceptance Scenarios**:

1. **Given** the schedule day-off and slot-interval chips, **When** measured,
   **Then** each is ≥44px tall.
2. **Given** the timeline block-delete confirm, settings camera/avatar corner
   buttons, and modal close/contact buttons, **When** tapped on a phone,
   **Then** the effective hit area is ≥44px (`min-h-11` or `.tap-44`).

### User Story 3 — One vocabulary in the back office (P3)

Owner chrome uses semantic tokens; only `design-tokens.ts` categorical palettes
(7-status ops colors, timeline blocks, activity dots) may use literal colors.

**Acceptance Scenarios**:

1. **Given** owner tsx files, **When** grepped for palette utilities, **Then**
   only sanctioned categorical sources hit.

## Requirements

- **FR-001**: No collected input may be discarded (no fake features) (AGENTS.md).
- **FR-002**: All interactive elements ≥44px effective target (P5).
- **FR-003**: UI chrome on semantic tokens; categorical colors only in
  design-tokens.ts (P2).
- **FR-004**: Existing owner flows (role guard, lane-split timeline,
  object-identity block removal, manual-reserve reconciliation) preserved (P3).

## Success Criteria

- **SC-001**: Zero opacity-disabled, zero palette strays, zero sub-44px
  unexpanded controls in owner surfaces.
- **SC-002**: `npm run check` green at the fix commit.
- **SC-003**: Findings + limits recorded in `docs/AUDIT-005-owner-tools.md`.
