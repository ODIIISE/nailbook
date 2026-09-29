# Feature Specification: Hardening — Viewports · Dark Mode · WCAG AA · Performance

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Implemented (commit `ec6360a`), report in `docs/AUDIT-008-hardening.md`

**Input**: Phase 11, the final roadmap phase: full viewport matrix, dark-mode
walk, WCAG AA contrast verification by computation, and a performance check.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — AA is a floor, not an aspiration (P1)

Every text/background pairing the tokens can produce — including alpha-blended
recipes (tinted pills, disabled text) — meets WCAG AA: 4.5:1 text, 3:1 UI.

**Acceptance Scenarios**:

1. **Given** the 20-pairing × 2-theme matrix, **When** computed, **Then** zero
   failures (was 8).
2. **Given** the «تأیید شده» pill, **Then** ≥4.5:1 (was 2.96 — the worst
   failure in the app).

### User Story 2 — Every screen holds at every size (P2)

Customer surfaces hold one viewport, never overflow horizontally, and degrade
per the AGENTS.md ladder from 375×667 through 430×932; desktop centers the
editorial column on a composed stage.

### User Story 3 — Dark mode is first-class (P3)

`prefers-color-scheme: dark` flips to the night palette with intact contrast,
no white flashes, and identical layout behavior.

### User Story 4 — Fast by structure (P3)

One consolidated bootstrap request (no waterfalls), small JS, no unoptimized
media without reason — the spec-003 budgets hold.

## Requirements

- **FR-001**: Contrast matrix green in both themes; feedback hues stepped to
  pass in their worst contexts (tinted pills, solid fills).
- **FR-002**: `--destructive-foreground` MUST exist (was used but undefined —
  silently inheriting ink-on-red at ≈2.6:1).
- **FR-003**: Disabled/past states MUST pass 4.5:1 (no alpha recipes below the
  floor).
- **FR-004**: Viewport matrix + dark walk verified on production.

## Success Criteria

- **SC-001**: 20/20 pairings PASS in light and dark (computed, reproducible).
- **SC-002**: Viewport matrix: 0 horizontal overflow, one-viewport holds,
  desktop column exactly centered — all verified live.
- **SC-003**: Dark walk on production: night palette applied, card/bg values
  correct, no layout breaks.
- **SC-004**: Performance: single `/api/read/bootstrap` + `/api/auth/me` only;
  55KB JS / 20KB CSS transfer; TTFB <1s.
- **SC-005**: `npm run check` green at the fix commit; tokens verified in the
  deployed CSS.
