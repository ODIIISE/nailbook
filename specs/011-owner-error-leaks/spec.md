# Feature Specification: Owner/Admin Error Surfaces — Persian-Only Sweep

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-30

**Status**: Implemented (commit `dd34d21`), report in `docs/AUDIT-011-owner-error-leaks.md`

**Input**: AUDIT-010 found raw English error text ("Failed to fetch") reaching
the customer booking UI. This sweep asks the same question of every owner and
admin surface: can any raw error — network failure, English exception, HTML
error page — reach the salon owner's or admin's screen?

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The owner's toasts always speak Persian (P4)

Every failure toast on owner surfaces (services, addons, schedule, highlights,
manual booking, uploads, cancellations) is Persian. Server messages (Persian by
contract) pass through verbatim; anything else is replaced by an actionable
Persian fallback.

**Acceptance Scenarios**:

1. **Given** any owner write failing due to a network drop, **When** the toast
   appears, **Then** it contains Persian text only.
2. **Given** the server returning a precise Persian validation message,
   **Then** that message still reaches the toast unchanged (preserve, not
   flatten).

### User Story 2 — The client library never throws English at the UI (P4, P2)

`db/data.ts` is the single client library every surface catches against. Its
thrown fallbacks must be Persian so the sanitizer's passthrough branch is safe
by construction.

**Acceptance Scenarios**:

1. **Given** any `data.ts` fetch failing with a non-JSON body, **Then** the
   thrown Error message is Persian.
2. **Given** the same library function, **Then** auth-expiry messages
   (نشست منقضی شده) are preserved.

### User Story 3 — One sanitizer, one definition (P2)

`persianizeError` lives in `src/lib/error-sanitize.ts`. Consumers import it;
nothing redefines it; tests pin both directions (no raw propagation, no
duplicate definitions).

**Acceptance Scenarios**:

1. **Given** the codebase, **When** any surface needs sanitization, **Then**
   it imports from `@/lib/error-sanitize`.
2. **Given** the contract tests, **Then** `salon-context`, schedule page,
   service-manager, and the customer cancel pages are all pinned.

### Edge Cases

- Owner manual-reserve modal: already sanitizes to a fixed Persian string ✓.
- Admin pages (bootstrap/export/import): catch-all Persian toasts ✓.
- API routes: all Persian error bodies (audited, unchanged) — English appears
  only in server-side console logs, which is correct.
- `update-salon` non-Error rethrow fallback converted to Persian.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1**: `src/lib/error-sanitize.ts` exports `persianizeError`; consumers
  import it.
- **FR-2**: All `data.ts` throw fallbacks are Persian (7 converted).
- **FR-3**: `updateServices`/`updateAddons` return sanitized Persian messages.
- **FR-4**: Owner schedule save and service-image upload sanitize before
  toasting.
- **FR-5**: Customer cancel sheets sanitize before toasting.
- **FR-6**: Contract tests pin: single definition, no raw `e.message`
  propagation in audited files, Persian fallbacks present in `data.ts`.

## Review & Acceptance Checklist

- GATE: `npm run check` green (223 tests / 21 files at implementation).
- GATE: customer booking flow smoke-passed live post-deploy (time step,
  day chips, CTA gating unchanged).

## Execution Status

- [x] Sweep complete (customer surfaces, owner components/pages, admin pages,
      API routes, client library)
- [x] FRs mapped to commit `dd34d21`
- [x] Tests written and green
- [x] Deployed and smoke-verified
