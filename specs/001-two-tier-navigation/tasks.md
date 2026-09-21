# Tasks: Two-Tier Navigation Without Duplication

**Input**: Design documents from `specs/001-two-tier-navigation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, quickstart.md

**Tests**: Included per repo convention (Vitest suite exists; a component contract test for the no-duplication invariant is warranted because it is the core acceptance rule).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create route group `src/app/(main)/` with `layout.tsx` rendering bottom clearance + `AppNavbar` (salon mode only, per research R2)

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T002 [P] Move `src/app/page.tsx` → `src/app/(main)/page.tsx` (verbatim; no path-referencing code exists, per research R6)
- [ ] T003 [P] Move `src/app/bookings/page.tsx` → `src/app/(main)/bookings/page.tsx`
- [ ] T004 [P] Move `src/app/bookings/[id]/page.tsx` → `src/app/(main)/bookings/[id]/page.tsx`
- [ ] T005 [P] Move `src/app/profile/page.tsx` → `src/app/(main)/profile/page.tsx`
- [ ] T006 Verify build resolves all routes and `npm run check` passes before continuing

## Phase 3: User Story 1 — Owner sees a deduplicated menu (P1) 🎯 MVP

- [ ] T007 [US1] In `src/components/layout/hamburger-menu.tsx`, remove the روزانه section (dashboard, working-hours, activity links) from `OwnerContent`; keep مدیریت + حساب sections per research R4

**Checkpoint**: Owner menu lists only services/customers/highlights/settings + view-site/logout; navbar untouched.

## Phase 4: User Story 2 — Customer gets a bottom navbar (P1)

- [ ] T008 [US2] Confirm `(main)/layout.tsx` renders on `/`, `/bookings`, `/profile` with correct active highlighting (covered by T001 + moves; validated in quickstart step 1–2)
- [ ] T009 [US2] Guest acceptance: navbar renders signed-out; existing `/bookings`, `/profile` signed-out handling works from navbar taps

**Checkpoint**: Customer primary nav works on all main pages, guests included.

## Phase 5: User Story 3 — Customer hamburger keeps only secondary content (P2)

- [ ] T010 [US3] In `hamburger-menu.tsx` `AccountCard`, remove the پروفایل / رزروهای من link rows and the مشاهده رزروها shortcut; keep identity, active-count badge, and خروج (per research R3)
- [ ] T011 [P] [US3] Add `src/components/layout/hamburger-menu.test.ts`: owner menu has no navbar-covered hrefs (`/owner`, `/owner/schedule`, `/owner/activity`); customer menu has no standalone خانه/نوبت‌ها/پروفایل links; guest keeps ورود مدیریت entry — the SC-001 zero-duplication invariant

**Checkpoint**: Zero navbar↔menu overlap on both roles; suite green.

## Phase 6: Polish & Cross-Cutting

- [ ] T012 Run quickstart.md validation end-to-end (salon + admin modes, light/dark, 360px width)
- [ ] T013 Full `npm run check` + `npm run build`; ship via push → CI → Vercel

## Dependencies & Execution Order

- T001 → T002–T005 (moves land inside the group) → T006
- T007, T010, T011 are independent of the moves (different files) and can run in parallel with Phase 2
- T008–T009 depend on T001–T005; T012–T013 depend on everything

## Implementation Strategy

- Ship as a single increment: the two-tier pattern only makes sense when both tiers are consistent on both roles simultaneously.
- Rollback is trivial: revert the single commit (moves are verbatim).
