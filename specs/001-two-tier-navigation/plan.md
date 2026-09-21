# Implementation Plan: Two-Tier Navigation Without Duplication

**Branch**: `main` (no branch hook registered; team ships via main) | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-two-tier-navigation/spec.md`

## Summary

Give both roles a two-tier navigation with zero duplication: a shared bottom navbar for the 3 primary destinations per role (owner already has one; customers get the same), and a hamburger that holds only secondary destinations. Owner hamburger drops the 3 navbar-covered links; customer hamburger drops the navbar-covered links (including the account card's inner profile/bookings rows). Customers reach the menu from any page via the navbar's منو button.

## Technical Context

**Language/Version**: TypeScript 5.x / React 19 / Next.js 16 (App Router)
**Primary Dependencies**: Tailwind CSS 4, lucide-react, @heroicons/react, Base UI
**Storage**: N/A (navigation UI only — no data model changes)
**Testing**: Vitest (existing suite), ESLint, `tsc --noEmit`, production build
**Target Platform**: Mobile-first responsive web (RTL, Persian), safe-area aware
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: No regression — navbar is CSS-only layout, no new data fetching
**Constraints**: RTL logical properties; 44px+ tap targets; no hydration mismatch between server/admin-mode and client
**Scale/Scope**: 1 new route-group layout, 3 page-tree moves, 1 component refactor (hamburger), 0 API changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is still the unfilled Spec Kit template — no ratified gates exist. Provisional gates applied for this feature (mirroring repo conventions):

- ✅ Simplicity: reuse existing `AppNavbar` + `menu-context`; no new nav library
- ✅ No scope creep: navigation only; no data/API changes
- ✅ Verify: full `npm run check` + build must pass before ship

## Project Structure

### Documentation (this feature)

```text
specs/001-two-tier-navigation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output (manual validation guide)
├── checklists/
│   └── requirements.md  # Spec-quality checklist (from /speckit.specify)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

**Skipped artifacts (documented decision)**: `data-model.md` — feature has no entities or data; `contracts/` — no external interfaces; the change is purely internal UI composition.

### Source Code (repository root)

```text
src/
├── app/
│   ├── layout.tsx                  # Root layout (unchanged — Providers + HamburgerMenu live here)
│   ├── (main)/                     # NEW route group: chrome pages (URLs unchanged)
│   │   ├── layout.tsx              # NEW: bottom padding + AppNavbar (salon mode only)
│   │   ├── page.tsx                # MOVED from src/app/page.tsx (server component; admin/salon branch)
│   │   ├── bookings/
│   │   │   ├── page.tsx            # MOVED
│   │   │   └── [id]/page.tsx       # MOVED
│   │   └── profile/page.tsx        # MOVED
│   ├── book/                       # Stays OUTSIDE (full-screen flow, own chrome)
│   ├── portfolio/                  # Stays OUTSIDE (secondary destination, own back header)
│   ├── login/                      # Stays OUTSIDE (auth screen)
│   ├── owner/                      # Stays OUTSIDE (has its own layout with navbar)
│   └── ...
├── components/
│   └── layout/
│       ├── app-navbar.tsx          # Reused as-is (customer default items already defined)
│       └── hamburger-menu.tsx      # EDIT: dedupe owner + customer/guest contents
```

**Structure Decision**: Next.js route group `(main)` gives the customer chrome to exactly the main pages without changing any URL. The group layout is a server component, so it can branch on `isSalonMode()` and render the navbar only for salon deployments (admin-platform landing keeps its current chrome-free hamburger-only design). `/book`, `/portfolio`, `/login`, `/owner/*`, `/admin/*` stay outside the group.

## Complexity Tracking

No constitution violations to justify — the route group is the simplest mechanism Next.js offers for shared chrome without URL changes.
