# Feature Specification: Session-Expiry Flow — Friendly Re-Auth, No Data Loss

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-30

**Status**: Implemented (commit `88060ba`), report in `docs/AUDIT-012-session-expiry.md`

**Input**: Owner sessions expire after 30 days. The only expiry signal is the
first failing API call, which used to hard-redirect to the owner login with no
regard for who the user was (expired customers were shipped to the owner login)
or what they were editing (unsaved schedule/service/addon drafts were
abandoned).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Re-auth routes by surface (P1, P9)

An expired session must send the user to the login that matches who they are:
owner/admin surfaces → owner login; customer/shared surfaces → customer login.

**Acceptance Scenarios**:

1. **Given** a 401 on `/owner/**` or `/admin/**`, **Then** the redirect goes
   to `/owner/login`.
2. **Given** a 401 on a shared surface (bookings, profile, booking flow),
   **Then** the redirect goes to `/login` — never the owner login.
3. **Given** multiple simultaneous 401s (a page firing several reads), **Then**
   the redirect fires exactly once (existing single-fire guard preserved).

### User Story 2 — The user comes back to where they were (P1, P3)

After re-auth, the user returns to the exact page they were on — booking
flow, bookings list, owner schedule — not a generic dashboard.

**Acceptance Scenarios**:

1. **Given** an expiry redirect, **When** the user completes login, **Then**
   they land on the stashed path (per-tab, cleared after use).
2. **Given** a fresh login (no stash), **Then** the existing defaults hold
   (`/?welcome=1` customer, `/owner?welcome=1` owner).
3. **Given** a brand-new customer finishing registration, **Then** the
   return-to survives the name step and still routes correctly.

### User Story 3 — Owner edits survive the round-trip (P1, P5)

Dirty owner forms (schedule, services, addons) must survive the expiry
redirect + login round-trip, with no silent overwrites and no lying toasts.

**Acceptance Scenarios**:

1. **Given** unsaved schedule edits when the session expires, **When** the
   owner returns after login, **Then** the form shows their edits and the
   save bar reports unsaved changes.
2. **Given** the same for services or addons, **Then** the pending list is
   restored and flagged dirty.
3. **Given** the owner saves or discards, **Then** the draft stash is cleared.
4. **Given** the owner login page, **When** drafts actually survived, **Then**
   a Persian toast says so; **When** none survived, **Then** no toast appears.

### Edge Cases

- Private-browsing sessionStorage failures: all stash operations are
  try/catch-guarded; login falls back to defaults.
- Corrupt draft JSON: restore fails clean, form starts from server props.
- Two owner tabs: sessionStorage is per-tab — a stale tab never injects
  another tab's edits.
- Draft restore vs prop-sync: restoration wins exactly once on mount; the
  existing `hasChanges` guard then protects it from later prop refreshes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1**: `src/lib/session-expiry.ts` is the single decision point for
  expiry routing (`expiryTargetFor`, `redirectAfterExpiry`), return-to
  stash (`getReturnTo`/`clearReturnTo`), and draft inventory
  (`countOwnerDrafts`, `OWNER_DRAFT_KEYS`).
- **FR-2**: `handleAuthExpiry` delegates to `redirectAfterExpiry`; no hard-
  coded login path remains in the shared handler.
- **FR-3**: Schedule-manager persists dirty state to
  `nailbook_schedule_draft` on every edit; restores on mount; clears on
  save/discard.
- **FR-4**: Service-manager persists both tabs at the `markChanged`
  chokepoint; restores once per mount via `queueMicrotask` (house rule);
  clears on save/discard.
- **FR-5**: Owner login consumes return-to, reports preserved drafts in
  Persian only when they exist.
- **FR-6**: Customer login consumes return-to for existing users and keeps
  it through registration for new users (`returnToRef`).

## Review & Acceptance Checklist

- GATE: `npm run check` green (227 tests / 21 files at implementation).
- GATE: live end-to-end expiry walk requires a real owner session
  (designer checklist); contract tests pin all wiring.

## Execution Status

- [x] Machinery mapped (handleAuthExpiry, login pages, layouts, forms)
- [x] FRs mapped to commit `88060ba`
- [x] Tests written and green
- [x] Deployed
