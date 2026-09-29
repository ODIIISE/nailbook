# Feature Specification: Admin Surfaces — Minimal Consistency Pass

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Implemented (commit `830043d`), report in `docs/AUDIT-006-admin.md`

**Input**: Phase 9: admin surfaces (login gate, overview, salons CRUD,
import/export/migrate/bootstrap) at a minimal pass — this is rare-use internal
infrastructure; the goal is no dead ends and no constitution violations, not
gold-plating.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — No silent dead ends (P1)

Every failure path in admin explains itself and offers a way forward; no page
ever renders a permanent blank frame after its toast dismisses.

**Acceptance Scenarios**:

1. **Given** the admin dashboard, **When** the stats fetch fails, **Then** an
   explicit error state with retry renders (never `null`).
2. **Given** the salon detail page, **When** its fetch throws, **Then** an
   explicit error state with a way back renders.
3. **Given** the admin login, **When** invalid input is submitted, **Then** an
   inline `role=alert` explains it (button never silently dead — the customer
   recipe from AUDIT-001).

### User Story 2 — Persian-first data (P2)

Counts and rates the admin reads are Persian digits with the Persian percent
sign; phones/tables stay LTR where appropriate.

**Acceptance Scenarios**:

1. **Given** KPI cards and rate stats, **When** rendered, **Then** digits are
   Persian and percent signs are «٪».

### User Story 3 — Real affordances (P5)

Navigation lives on real links/buttons, not row-level pseudo-buttons.

## Requirements

- **FR-001**: No permanent `return null` after a failed fetch on any admin page
  (transient redirect states exempt) (P5/F5).
- **FR-002**: Admin login MUST match the customer login validation recipe
  (normalize Persian digits, tap-to-explain, `role=alert`) (P2/P5).
- **FR-003**: Counts/rates in Persian digits (P4).
- **FR-004**: Mechanical sweeps (opacity-disabled, palette strays, English
  ARIA, sub-44px controls) stay at zero in admin code.

## Success Criteria

- **SC-001**: All acceptance scenarios verified (dashboard error state
  confirmed in the deployed chunk; login recipe verified live on production).
- **SC-002**: `npm run check` green at the fix commit.
- **SC-003**: Findings recorded in `docs/AUDIT-006-admin.md`.
