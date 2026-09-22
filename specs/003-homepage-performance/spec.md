# Feature Specification: Homepage Performance Fix + Glasses Mascot

**Feature Branch**: `main` (team ships via main)
**Created**: 2026-09-22
**Status**: Approved (user clarifications resolved via Q&A)
**Input**: "Revert the recent changes to the home screen … Fix the home screen loading issue. It sometimes takes ~5 seconds to load and shows an error tooltip … home screen should become usable within 1 second" — later refined: keep the mascot on the homepage using the **Glasses** character (random-per-visit concept collapsed to a single character by user choice), **no mascot on the booking confirmation step**.

## User Scenarios & Testing

### User Story 1 — Fast homepage (Priority: P1)
A visitor opens the site. The page shell (navbar + hero with the mascot frame) appears almost immediately, and the page is usable (scrollable, tappable, hero visible) within ~1 second on a warm connection, without any error toast — even when the database is slow or some non-critical payloads fail.

**Acceptance**:
- Given a cold server, when the visitor opens `/`, then the shell renders before data arrives (no full-page skeleton gate).
- Given any mix of API outcomes, when the data load settles, then a critical failure (salon or services) shows the error toast exactly once, and partial success shows **no** toast.
- Given data that arrives after a long delay, when it lands, then it is adopted (never discarded) and no false toast appears.

### User Story 2 — One efficient data load (Priority: P1)
The client performs **one** consolidated request for the initial payload instead of six parallel round-trips.

**Acceptance**:
- `GET /api/read/bootstrap` returns the full context payload (salon, services, addons, highlights, blockedTimes, and bookings when a session exists) in a single response with CDN cache headers for public data.
- If the bootstrap request fails, the client falls back to the existing individual endpoints (behavior preserved).

### User Story 3 — Glasses mascot on the homepage (Priority: P2)
The homepage hero shows the Glasses character from page-mascot. It follows a finger/cursor, reacts to taps, and weighs no more than the previous cat (~255KB total).

**Acceptance**:
- Sheets served from `public/mascots/glasses-*.webp`, ≤300KB each, ≥720px source.
- No mascot anywhere in the booking flow; booking success step unchanged.

### Edge Cases
- Bootstrap succeeds partially (some payloads null) → adopted payload-by-payload; toast only when salon or services are missing.
- Session-less visitor on `scope=all` → bookings omitted; no crash.
- `prefers-reduced-motion` → mascot reactions/squash damped (already implemented in vendored component).

## Requirements *(mandatory)*
- **FR-1**: Homepage shell (navbar + hero) MUST render without waiting for any data fetch.
- **FR-2**: Initial data MUST come from a single consolidated endpoint with `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on public data.
- **FR-3**: Data adoption MUST be allSettled-based (partial results kept), with per-fetch 10s timeouts.
- **FR-4**: Error toast MUST fire only when a critical payload (salon or services) fails; never when data arrived.
- **FR-5**: Glasses sheets MUST replace the cat in `public/mascots/`; cat sheets deleted.
- **FR-6**: Booking flow MUST NOT reference any mascot.
- **FR-7**: The unused `page-mascot` npm dependency MUST be removed (the vendored component is self-contained).

## Success Criteria
- Homepage shell interactive <1s warm / <2.5s cold (production).
- Zero false error toasts across 10 consecutive loads.
- Full booking flow completes with no mascot at confirmation.
- CI green; both Vercel projects deployed.
