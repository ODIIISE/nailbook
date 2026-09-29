# Feature Specification: Cross-Screen Consistency Pass (+ Skin Decision)

**Feature Branch**: `main` (per designer decision — no feature branches)

**Created**: 2026-09-29

**Status**: Implemented (commit `171d272`), report in `docs/AUDIT-004-consistency.md`

**Input**: Phase 7 of the UI roadmap: one consistency sweep across customer and
owner surfaces, plus resolution of the skin question (custom vs daisyUI 5)
pending since Phase 0.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — One design language, mechanically true (P1)

Any screen a customer or owner touches uses the same token vocabulary: no raw
Tailwind palette colors in UI chrome, no opacity-faded disabled states, no
arbitrary `rounded-[Npx]` outside the editorial homepage, 44px interactive
targets on text controls.

**Why this priority**: Drift is invisible one commit at a time; a mechanical
sweep is the only way it gets caught.

**Independent Test**: grep sweeps return zero violations outside sanctioned
categorical palettes (`src/lib/design-tokens.ts`) and the editorial homepage.

**Acceptance Scenarios**:

1. **Given** any non-landing tsx file, **When** grepped for
   `amber-/yellow-/red-/blue-/green-` utilities, **Then** zero UI-chrome hits
   (palette use is only in `design-tokens.ts` categorical data colors).
2. **Given** any interactive control, **When** disabled, **Then** it uses a
   readable recipe (tinted bg + foreground/60 or muted-foreground), never
   `disabled:opacity-*`.
3. **Given** any text control outside the header pattern, **Then** touch
   target ≥44px (min-h-11).

### User Story 2 — The skin question is answered with eyes, not vibes (P2)

The designer decides custom-vs-daisyUI from a live side-by-side rendering the
same components in both skins, not from a spec table.

**Acceptance Scenarios**:

1. **Given** `docs/skin-side-by-side.html`, **When** opened, **Then** both
   columns render the same Persian booking UI in light + dark.
2. **Given** the comparison, **When** the designer decides, **Then** the
   decision and its rationale are recorded in the audit doc.

## Requirements

- **FR-001**: UI chrome MUST use semantic tokens only; categorical data colors
  live exclusively in `src/lib/design-tokens.ts` (Constitution P2).
- **FR-002**: Disabled states MUST be readable (no opacity fades) (P5).
- **FR-003**: Radii MUST come from the radius scale (sm/md/lg/xl) outside the
  editorial homepage (P2).
- **FR-004**: Text controls MUST meet the 44px target floor (P5).
- **FR-005**: The skin decision MUST be recorded with the side-by-side
  artifact; reversal requires a new decision record, not drift.

## Success Criteria

- **SC-001**: Sweeps clean: 0 palette-color chrome hits, 0 `disabled:opacity-*`,
  0 arbitrary radii outside sanctioned files.
- **SC-002**: `npm run check` green at the fix commit.
- **SC-003**: Skin decision recorded; artifact committed to docs/.
