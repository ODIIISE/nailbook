# Feature Specification: Two-Tier Navigation Without Duplication

**Feature Branch**: `main` (no branch hook registered; team ships via main)

**Created**: 2026-09-22

**Status**: Draft → Clarified (Q1 resolved: two-tier nav on both sides)

**Input**: User description: "the routing isnt good enough. dont want to duplicate navbar items in hamburger menu. in owner and customer side. fix it."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner sees a deduplicated menu (Priority: P1)

An owner using the panel opens the hamburger menu and sees only destinations the bottom navbar does not already provide. The daily surfaces (dashboard/timeline, working hours, activity history) are reached through the bottom navbar alone and no longer appear in the menu.

**Why this priority**: The duplication is visible on every owner session today; removing it is the core of the request.

**Independent Test**: Open the owner hamburger and compare its items against the owner navbar items — no overlap.

**Acceptance Scenarios**:

1. **Given** an authenticated owner, **When** they open the hamburger menu, **Then** the menu lists only مدیریت (services, customers, highlights, salon settings) and account actions (view customer site, logout) — not dashboard, working hours, or activity history.
2. **Given** the owner bottom navbar, **When** the owner taps its items, **Then** dashboard/timeline, working hours, and activity history remain reachable exactly as before.

### User Story 2 - Customer gets a bottom navbar (Priority: P1)

A customer (or guest) on any main customer page sees a fixed bottom navbar with خانه / نوبت‌ها / پروفایل plus a منو button, mirroring the owner panel's pattern.

**Why this priority**: The user chose "two-tier nav on both sides"; without this, the customer side has no primary nav and the hamburger stays the only navigation surface.

**Independent Test**: Visit `/`, `/bookings`, `/profile` signed-in — the navbar renders with the current page highlighted.

**Acceptance Scenarios**:

1. **Given** a signed-in customer on any main customer page, **When** they look at the bottom of the viewport, **Then** a navbar with خانه، نوبت‌ها، پروفایل، منو is visible and the current page is highlighted.
2. **Given** a guest (not signed in), **When** they browse main customer pages, **Then** the same navbar appears; tapping نوبت‌ها or پروفایل routes them to the existing signed-out handling for those pages.

### User Story 3 - Customer hamburger keeps only secondary content (Priority: P2)

The customer/guest hamburger stops repeating the primary destinations and focuses on: account card, نمونه‌کارها, salon info, theme, and (for guests) ورود مدیریت.

**Why this priority**: Completes the no-duplication promise on the customer side.

**Independent Test**: Open the customer hamburger — خانه، نوبت‌ها، پروفایل do not appear as menu items.

**Acceptance Scenarios**:

1. **Given** a signed-in customer, **When** they open the hamburger, **Then** no item duplicates the navbar destinations; the account card and secondary links remain.
2. **Given** any role, **When** the theme menu is used from the menu footer, **Then** it behaves as before.

### Edge Cases

- Full-screen booking flow (`/book`): stays chrome-free (its own back-header); the navbar must not appear there.
- Owner login page (`/owner/login`): no navbar (existing behavior preserved).
- Guest taps نوبت‌ها/پروفایل: pages already handle signed-out state; no separate guest route needed.
- Landscape/small viewports: navbar scrolls nothing; items fit (4 items max, same as owner today).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The customer-side main pages MUST render the shared bottom navbar with خانه، نوبت‌ها، پروفایل and a منو button that opens the existing hamburger.
- **FR-002**: The current page MUST be visually highlighted in the navbar (same active treatment as the owner navbar today).
- **FR-003**: The owner hamburger menu MUST NOT list destinations already served by the owner bottom navbar (dashboard/timeline, working hours, activity history).
- **FR-004**: The customer hamburger menu MUST NOT list destinations served by the customer bottom navbar (home, bookings, profile) as standalone menu links.
- **FR-005**: The hamburger MUST retain all non-duplicated destinations: owner — services, customers, highlights, salon settings, view customer site, logout; customer/guest — account card, portfolio, salon info, theme, owner login entry for guests.
- **FR-006**: Page content MUST reserve bottom space so the navbar does not cover interactive content (parity with the owner layout today).
- **FR-007**: The booking flow route (`/book`) MUST NOT render the navbar.
- **FR-008**: Every route previously reachable from either surface MUST remain reachable from exactly one primary surface (navbar) or the hamburger, with no dead links.

### Key Entities *(include if feature involves data)*

- **Nav surface (conceptual)**: two tiers — primary (bottom navbar, role-specific, max 3 destinations + منو) and secondary (hamburger, everything else). No data model changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero overlapping destinations between navbar and hamburger on both roles (auditable by listing both surfaces).
- **SC-002**: All owner + customer destinations remain reachable (no removed capability) after the change.
- **SC-003**: Any main customer page can open the menu in one tap via the navbar's منو button.
- **SC-004**: No horizontal overflow and no content obscured by the navbar on 360px-wide viewports in both themes.

## Assumptions

- The existing `AppNavbar` component is reused for the customer side (its customer item config already exists).
- The navbar's منو button opens the same shared hamburger menu used today.
- `/portfolio` stays a secondary destination (hamburger only), not a navbar item.
- The booking flow keeps its own full-screen chrome; only main pages get the navbar.
- Signing-out from the customer menu keeps current redirect behavior.
