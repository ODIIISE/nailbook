# Nailbook UI Constitution

The UI quality bar for Nailbook. Every UI change — by human or AI — is checked against
this document. Findings reference principle numbers (e.g. "violates P6").
Supersedes personal taste; amend only with the designer's explicit approval.

**Version**: 1.0.0 | **Ratified**: 2026-09-28 | **Last Amended**: 2026-09-28

## Core Principles

### I. Fix the right level first (L1→L4)

Severity is judged in this order. Never polish a lower level while a higher one is broken:

1. **L1 — UX**: user can't tell what to do, can't tell selected state, ambiguous errors, unexpected navigation, too many decisions.
2. **L2 — Structure**: hierarchy, spacing, layout, grouping, responsive behavior.
3. **L3 — Component consistency**: buttons, inputs, cards, dialogs, badges, icons.
4. **L4 — Polish**: shadows, micro-spacing, icon alignment, motion, typography detail.

### II. The system is the source of truth

- One source of truth for every visual value: tokens in `src/app/globals.css`, roles in
  `DESIGN-SYSTEM.md`. Never hardcode colors, radii, shadows, spacing, or durations.
- No parallel vocabularies: no new token names, no one-off `rounded-[13px]`, no raw
  `shadow-sm/md/lg`, no `font-extrabold` outside the editorial homepage.
- Documentation must match implementation; when they diverge, fix the implementation,
  then update the doc in the same change.

### III. Preserve, then improve

- Preserve → extend → refactor → replace. Never delete-and-rebuild working code.
- Business logic, Jalali/Persian behavior, and data flow are untouched by UI work
  unless a L1 UX problem demands it — and then only with the designer's approval.
- No fake features, no mock actions, no hardcoded demo data (repo AGENTS.md rule).

### IV. Persian-first RTL

- Logical CSS only (`ps/pe`, `ms/me`, `start/end`); physical properties (`pl/pr`,
  `ml/mr`, `left/right`) are bugs.
- Persian digits and Jalali dates everywhere user-facing; `dir="ltr"` for phone
  numbers, tracking codes, and times.
- Test Persian text wrapping and mixed-script lines — clipping here is an L2 defect.

### V. Touch-first interaction

- 44×44px minimum touch targets; buttons never gain hover shadows (hover is a
  desktop affordance).
- Visible, predictable states: hover, focus-visible, active, disabled, selected,
  loading. A state you can't see is a missing state.
- Focus rings meet 3:1 non-text contrast; disabled content stays readable
  (≥4.5:1 tint recipes, not `opacity-50`).

### VI. WCAG AA is a floor, not a goal

- Text: 4.5:1 (large text 3:1). Non-text essentials (icons, borders that carry
  meaning, focus rings): 3:1.
- Contrast is computed, not estimated. New color pairs ship with their ratios noted
  in a comment.

### VII. Elevation means something

- The 4-step ladder (`shadow-xs` / `card` / `elevated` / `floating`) is the only
  elevation vocabulary. Most surfaces are flat or `xs`.
- If everything is elevated, nothing is. Borders and background steps come first;
  shadows are the last resort.

### VIII. Motion is governed, then crafted

- Motion tokens (`--duration-*`, `--ease-*`) are the only timing vocabulary;
  `motion-governance` tests enforce this.
- Craft rules (Emil design-eng): enter = ease-out, exit = ease-in, emphasis =
  spring; animate `transform`/`opacity` only; durations 150–450ms for UI feedback;
  `prefers-reduced-motion` always honored; if motion doesn't aid orientation,
  feedback, hierarchy, or transition — remove it.

### IX. Three roles, never one

Substantial UI changes run: **Designer** (the user decides direction) →
**Implementer** → **independent Reviewer** (fresh-eyes critique of the *rendered*
screen, not the code) → fix → re-verify. Proportional to size; one-line fixes skip
the reviewer.

### X. Done means verified

The definition of done for any UI change:
1. Renders correctly in a real browser, console clean.
2. Screenshots at 375×667, 390×844, 430×932, ≥1280 desktop; RTL correct at all.
3. `npm run check` green (lint + tsc + tests).
4. Reviewed against this constitution; findings resolved or explicitly accepted.
5. Before/after evidence exists (screenshot pair) for anything visual.

## Additional Constraints

- **Homepage is in scope** (designer decision, 2026-09-28). It keeps its editorial
  character — emotion, discovery, trust — and is therefore exempt from weight-repetition
  restraint (P2's `font-extrabold` ban) but NOT from contrast (P6), RTL (P4), or touch (P5).
- Viewport targets mirror AGENTS.md: 375×667, 390×667, 390×740, 390×844, 430×932,
  tablet, desktop, large desktop.
- Skills used every phase: `review-animations` gates motion changes; `mobile-native`
  audits native feel; `improve-animations` plans motion work; `prototype` for
  multi-direction design decisions; `pick-ui-library` before any new dependency.

## Governance

- The designer (non-coder) approves direction at every phase gate; implementation
  details are delegated.
- Findings in audits are tagged with principle numbers and severity
  (critical / high / medium / low).
- Amendments: designer approves, version bumps, date updates.
