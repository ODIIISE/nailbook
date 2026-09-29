# Feature Specification: Craft Pass — Motion · Icons · Mobile-Native

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Implemented (commit `640845c`), report in `docs/AUDIT-007-craft.md`

**Input**: Phase 10: review all motion against the constitution (P8) and the
repo's own motion-governance test, sweep icon usage for one visual language,
and audit mobile-native behavior (safe areas, zoom, haptics, scroll).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Motion is governed (P1)

Every animation/transition lives in a sanctioned zone (tokens, editorial
homepage, stock primitives), animates a real state change, and is neutralized
under reduced-motion.

**Acceptance Scenarios**:

1. **Given** any non-editorial, non-primitive file, **When** grepped for raw
   durations/`transition-all`/`animate-*`, **Then** zero hits.
2. **Given** every declared transition, **When** inspected, **Then** a real
   state change exists on the other side (no dead transitions).

### User Story 2 — One icon language (P2)

lucide-react is the icon set; exceptions are explicit, documented, and
justified by capability gaps (filled/outline pairs).

**Acceptance Scenarios**:

1. **Given** all tsx files, **When** swept for icon imports, **Then** only
   lucide + the sanctioned exceptions appear.
2. **Given** the convention, **When** a new screen is built, **Then** the
   inventory documents which set to reach for.

### User Story 3 — Feels native on a phone (P3)

Safe areas respected, no iOS focus-zoom (16px inputs on mobile), haptics on
key actions, vertical scroll never hijacked.

**Acceptance Scenarios**:

1. **Given** the shell, **When** inspected, **Then** safe-area insets top+bottom
   and `viewportFit: cover` are present.
2. **Given** any input, **When** focused on iOS, **Then** font-size ≥16px on
   phones (no auto-zoom).

## Requirements

- **FR-001**: Raw motion values only in sanctioned zones (motion-governance).
- **FR-002**: Icon imports only lucide-react + documented exceptions.
- **FR-003**: Mobile-native behaviors preserved (safe areas, 16px inputs,
  haptics, overscroll containment).

## Success Criteria

- **SC-001**: Sweeps at zero; motion-governance test green.
- **SC-002**: `npm run check` green at the fix commit.
- **SC-003**: Conventions recorded in the inventory; report in `docs/AUDIT-007-craft.md`.
