---
name: design-system-audit
description: Audits existing UI code and rendered pages against DESIGN-SYSTEM.md and reports inconsistencies — duplicated patterns, off-token spacing/colors/radii, typography drift, inaccessible patterns. Read-only audit; no refactoring unless explicitly requested.
---

# Design System Audit

Audit the UI against the source of truth: `DESIGN-SYSTEM.md`, `src/app/globals.css`, `src/lib/design-tokens.ts`, `src/components/ui/`. Do not refactor unless explicitly asked.

## What to check

1. **Tokens** — raw color/radius/shadow/spacing values where a semantic or `--qhp-*`/`--qbf-*` token exists (grep for hex colors, `rounded-*`/arbitrary values, px padding).
2. **Typography** — ad-hoc font sizes/weights where `.text-display`…`.text-caption` applies.
3. **Components** — duplicated local components duplicating `src/components/ui/` primitives; inconsistent variants.
4. **RTL** — physical properties (`pl/pr/ml/mr/left/right`) where logical ones (`ps/pe/ms/me/start/end`) are required; missing `dir="ltr"` on numbers/times.
5. **Inconsistency** — same role styled differently across pages (buttons, cards, badges, empty states).
6. **Accessibility** — contrast, focus visibility, target sizes <44px, missing labels, motion without reduced-motion support.
7. **Dark mode** — surfaces that break under the documented dark token set.

## Method

Grep and read code for 1–5, 7; render representative routes with Playwright (`channel="msedge"`, desktop + mobile) for 6 and for anything invisible in code.

## Output

Grouped findings by severity with file:line references, the violating value, the token/pattern that should be used instead, and an estimated blast radius. End with the smallest set of token/primitive additions that would eliminate the most violations. No large refactor proposals unless requested.
