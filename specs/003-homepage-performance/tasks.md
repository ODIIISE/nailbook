# Tasks: Homepage Performance Fix + Glasses Mascot

**Input**: specs/003-homepage-performance/spec.md

## 1. Mascot swap
- [x] T001 Download `characters/glasses/{directions,reactions}.png` from nilbuild/page-mascot
- [x] T002 Convert to WebP (720px, q65) → `public/mascots/glasses-*.webp` (255KB total), delete cat sheets
- [x] T003 Point `lux-home.tsx` hero at glasses sheets

## 2. Consolidated bootstrap endpoint
- [x] T004 `src/app/api/read/bootstrap/route.ts` — single server-side load: salon (incl. gallery), services, addons, highlights; `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`
- [x] T005 `scope=all` adds blockedTimes + session-scoped bookings; unit test for shape + cache header

## 3. Context load rewrite
- [x] T006 Try bootstrap once → fall back to 6 individual fetches on failure; per-fetch `AbortSignal.timeout(10s)`
- [x] T007 `Promise.allSettled` adoption (partial keeps), remove 12s race timer, toast only on critical failure
- [x] T008 Unit tests: partial adoption, toast-only-on-critical, bootstrap fallback

## 4. Sub-second homepage shell
- [x] T009 Homepage no longer gated behind `SalonGuard`; hero renders immediately, gallery/lookbook hydrate on arrival

## 5. Regression contracts
- [x] T010 Source-contract tests: glasses refs on homepage, no mascot in booking flow, no `page-mascot` dep, cat sheets absent

## 6. Ship
- [x] T011 Remove unused `page-mascot` dependency
- [x] T012 `npm run check` + `npm run build` → commit (with specs/) → push → CI → Vercel
- [x] T013 Live regression: production timing, booking-flow E2E, owner spot-check
