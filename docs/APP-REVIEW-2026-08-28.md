# Nailbook — Full App Review (2026-08-28)

Deep review of the whole app: security/auth, booking engine, all 58 API routes, frontend/UX, and infrastructure. Every finding below was verified by reading the code (file:line references included). Baseline health at review time: **lint ✓, TypeScript strict ✓, 98/98 tests ✓**.

---

## Executive summary

The app is in genuinely good shape for its stage: the atomic booking path (advisory locks + partial unique indexes), the OTP system (CSPRNG, atomic single-use consumption), session signing (timing-safe HMAC, per-request DB role checks), and Tehran timezone handling are all done correctly. The scheduler/slot math is well tested. The customer flow has real a11y investment and proper double-submit protection.

The problems cluster in five areas:

1. **Authorization gaps in owner/admin mutations** — one owner can take over another owner's account; a profile update can rewrite other tenants' bookings.
2. **Server trusts the client too much on time** — no server-side past-date validation; slots are generated only on the client.
3. **Silent production misconfigurations** — the SMS provider in code (FarazSMS) doesn't match the configured provider (sms.ir), so OTPs may only be console-logged in production; the owner "block user" feature does nothing; failed cancels show success toasts.
4. **Dead/duplicated engine code** — `src/lib/scheduler/**` and `/api/book/reserve` are unused; the live engine drifts from spec v7 in several places.
5. **Hygiene debt** — duplicate migration numbers, dead deps, env example drift, untested booking write path.

---

## P0 — Critical (fix before any new features)

### 1. Co-owner account takeover via phone change
`src/app/api/owner/users/route.ts:238-272` (PUT)
Role guards (can't change another owner's role) only run inside `if (body.role !== undefined)`. A PUT with only `{ userId, phone }` skips them entirely — any owner can rewrite **another owner's** phone to a number they control, then OTP-login as that owner via `send-otp?roleContext=owner` (the phone now has the owner role). The PUT audit log also doesn't record who made the change.
**Fix:** reject phone/name edits targeting any owner-role row (same guard as role changes); log `owner.id` in the PUT audit entry.

### 2. Cross-tenant booking rewrite in update-profile
`src/app/api/auth/update-profile/route.ts:69-75`
On phone change: `UPDATE bookings SET customer_phone = $1 WHERE customer_phone = $2 AND (user_id = $3 OR user_id IS NULL)` — **no `salon_id` predicate**. In the shared admin DB, a customer of salon A changing their phone silently rewrites salon B's bookings that share the old phone (including guest bookings with `user_id IS NULL`).
**Fix:** add `AND salon_id = $salonId` (or scope to `user_id = $3` only).

### 3. No server-side past-date/past-slot validation (spec §9 violation)
`src/lib/booking/service.ts:296-352` (`createBooking`), `src/app/api/book/route.ts`
The only past-slot filter is client-side (`src/lib/slots.ts:450-461`) using the **device clock**. A wrong device clock or a crafted request can book yesterday or 10 minutes ago. Spec requires server-side filtering via `getTehranNow()`.
**Fix:** in `createBooking`, reject when `date_gregorian < getTehranDateKey(now)` or (same day) `normStart <= getTehranNow().minutes`.

### 4. SMS provider contradiction — OTPs may silently not send
`src/lib/sms.ts:1` imports `farazsms`; `getSmsProvider()` returns `FarazSmsProvider`; but `.env.local`, `.env.local.example`, docs, and `scripts/test-sms.ts` are all configured around **sms.ir**. `SMS_IR_*` vars are never used by the app runtime; `FARAZSMS_*` vars don't exist in env → the provider **silently falls back to console.log of OTP codes**. Also `DEBUG_SMS` gating: verify carefully what production does when credentials are missing.
**Fix:** pick one provider (code currently says FarazSMS), align env files + docs, and make missing credentials **throw** instead of console-logging OTPs.

### 5. Customer sees "booking cancelled" success on a failed cancel
`src/lib/salon-context.tsx:303-319` — `cancelBooking` catches errors and returns `false`; but `src/app/bookings/page.tsx:91-94` and `src/app/profile/page.tsx:169-172` ignore the result and always `toast.success("نوبت لغو شد")`. The booking stays active, the slot stays taken, and the customer believes it's cancelled.
**Fix:** `if (await cancelBooking(id)) toast.success(...) else toast.error(...)`.

---

## P1 — High (fix this sprint)

### Security

6. **Owner phone enumeration** — `src/app/api/auth/send-otp/route.ts:94-112`: with `roleContext:"owner"`, non-owner phones get 403 with a distinct body; owner phones get 200 + SMS. Enumerates which phone numbers are salon owners platform-wide. Fix: identical status/body always; only gate the actual send.
7. **"Block user" feature is dead** — `src/app/api/owner/users/route.ts:274-283` sets `locked_until`; no login path ever checks it (`verify-otp` only clears it). Blocked users can still log in and book; `failed_attempts` is written but never read. Fix: enforce `locked_until > NOW()` in `verify-otp`/user lookup.
8. **Bootstrap takeover surface** — `bootstrap-owner`/`bootstrap-super-admin` compare secrets with `!==` (non-timing-safe) and have no rate limit; a weak secret = full owner/super-admin on fresh deployments. Fix: `crypto.timingSafeEqual` + per-IP rate limit.
9. **Super-admin login lockout bypass** — `src/app/api/super-admin/login/route.ts:57-65`: rate key is the spoofable first `x-forwarded-for` value, and the in-memory map is uncapped (memory DoS). Fix: trusted client IP + max-size cap/sweep like `send-otp` has.
10. **CSV formula injection** — `src/app/api/admin/export/route.ts:70-81`: no neutralization of leading `=`/`+`/`-`/`@`; customer name/phone are attacker-controlled and flow into a CSV the super-admin opens in Excel/Sheets. Fix: prefix matching cells with `'`.
11. **Upload routes trust client metadata** — `upload-logo`/`upload-highlight`/`upload-service-image`: `file.type` is client-declared (no magic-byte check), extension comes from the raw client filename, and blob paths (`logos/…`, `highlights/…`) have **no salon namespace** in a shared public bucket — cross-tenant image exposure. Fix: extension allowlist, prefix paths with `salonId`, sniff bytes.
12. **Unthrottled verify-otp** — anyone who knows a victim's phone can burn 5 attempts and lock the victim out of login for the OTP's 5-min life, repeatedly. Fix: per-IP+phone throttle mirroring send-otp.
13. **Silent fail-open of session revocation** — `src/lib/customer-auth.ts:93-103`: if `session_version` column is missing (migration 006 unapplied), revocation is silently disabled while logout reports success. Fix: surface the state (startup warning) instead of silent pass.
14. **`/api/anti-spam` public oracle** — POST any phone (unvalidated), unthrottled, unscoped: reveals whether an arbitrary phone booked today + cheap unauthenticated DB hammering. Fix: require the customer session, scope by salon + session phone.

### Booking correctness

15. **`reserved` bookings never expire** — no `expires_at` column, no cron, no sweeper (`service.ts:270`, migrations 001/005/008/009/012). Abandoned/spam reservations block slots until the owner manually cancels. Fix: `expires_at` + lazy expiry in `assertSlotAvailable`/slot listing (or Vercel cron).
16. **Reopen-cancelled race** — `src/app/api/owner/bookings/status/route.ts:59-85`: cancelled→active transition checks overlap **without** the per-day `pg_advisory_xact_lock` that `createBooking` and owner manual booking take. Interleaving can produce overlapping active bookings the unique index won't catch (different end times). Fix: take the same advisory lock in the reopen branch.
17. **Dual tenant identity resolution** — `getSalonId()` (raw env, may be a slug) vs `resolveSalonId()` (slug→UUID). Data queries in `booking/service.ts`, all `read/*`, `owner/backup` (`route.ts:79,166`), `bookings/[id]` use the raw value; auth paths use the resolved UUID. With a slug configured, auth works but data queries 22P02-fail or mismatch — one refactor away from a cross-tenant incident. Fix: resolve once per request, canonical UUID everywhere.

---

## P2 — Medium (plan into next releases)

### Engine & spec conformance

18. **Engine sprawl / dead code** — `src/lib/scheduler/**` (engine, intervals, scoring, constraints, models) is imported by nothing but its own tests; `jalali-calendar.tsx` and `getNearestAvailableSlot()` are dead; **`/api/book/reserve` is never called** by any client (the real atomic path is `POST /api/book`) yet it's a weak unauthenticated availability oracle that even misses `in_progress` in its conflict filter. Decide: delete, or make it the spec's revalidation endpoint.
19. **Slot generation is client-side only** — `qwen-booking-flow.tsx` computes availability in the browser from `/api/read/*` data; the server never generates slots (only validates at booking time). Availability UX depends on client clock/data freshness. Long-term: move generation to a server endpoint.
20. **Spec v7 deviations** (all in `src/lib/slots.ts`): dynamic shift expansion slots are hidden rather than shown grayed before threshold (§7, lines 436-441); slot grid is anchored at shift start, not the R-aligned grid (§4 rule 1, line 455 — an `open=10:10` is accepted by `salon-settings.ts:56`); level-2 proximity admits slots only if the whole buffered slot fits in the window (§5, lines 161-171); legacy "suggested" classification doesn't follow §5 priority order (lines 273-299).
21. **Customer cancel of any status** — `src/app/api/bookings/[id]/route.ts:39-47`: customer can cancel `in_progress`/`completed`/past bookings (only `cancelled` is rejected), corrupting timeline/earnings; also uses the non-version session check (revoked cookies still work here). Fix: restrict to `reserved`/`confirmed` + future, use the version-checking verifier.
22. **Earnings rewrite history** — `src/lib/pricing.ts:22-36`: no price snapshot on `bookings`, so `calculateEarnings` re-prices all history with current prices; a price edit rewrites past revenue. Fix: store price breakdown on the booking at creation.
23. **Anti-spam miscounts** — `src/lib/anti-spam.ts:17-30`: counts appointments *scheduled for today* (not bookings *made today*), so a customer with 3 appointments today can't book any future date; and the query isn't salon-scoped. Fix: count by `created_at >= Tehran-today-start`, add `salon_id`.
24. **Tehran day boundary bugs in admin** — `src/app/api/admin/alerts/route.ts:14-17` uses `CURRENT_DATE` (UTC on Vercel) — 3.5h skew vs Tehran.

### API robustness

25. **500s on garbage input** — several routes let bad date/time strings reach Postgres casts: `book/reserve/route.ts:24-29`, `owner/bookings/route.ts:193`, `admin/salons/[id]/bookings/route.ts:24`, `admin/export` (unvalidated `salon_id`). Fix: validate ISO date/HH:MM server-side (`salon-settings.ts` already has validators).
26. **Unvalidated client URLs stored** — `read/highlights` PUT and `read/highlight-images` POST store client-supplied `cover_url`/`image_url`/`id` as-is.
27. **Blocked-times full replace** — `owner/blocked-times/route.ts:57-73`: DELETE-all + looped INSERTs (last-write-wins between concurrent owners); date/time strings unvalidated before insert.
28. **Pagination** — `read/bookings` hard-caps owner view at 200 rows (silently loses older bookings in the 30-day window); `activity-log.ts:127` caps at 200. Fix: cursor/`before` params.

### Migrations & DB

29. **Duplicate migration numbers 011/012/013** — harmless today (lexicographic sort happens to work, tracking is per-filename) but already caused a real bug: `011_add_splash_fields` targeted the wrong table, needing patch `017`. Future same-numbered files can silently reorder on fresh DBs. Fix: renumber uniquely.
30. **migrate.ts rollback reporting bug** — on failure, earlier committed files roll back but `pendingResults` still reports them `success: true` (`src/lib/db/migrate.ts:85-115`) → admin UI lies.
31. **`waitlist` table has no `salon_id`** (`012_waitlist_and_portfolio.sql`) — future waitlist feature would be cross-tenant in shared DB.
32. **Non-idempotent migrations** — 002 (`ADD CONSTRAINT`), 005, 008 (unique index) lack `IF NOT EXISTS` guards; `scripts/apply-migrations.mjs` lacks the legacy `_migrations` merge that `migrate.ts` has, so it re-runs and crashes on legacy-tracked DBs.
33. **Migration files read from `process.cwd()`** at runtime (`migrate.ts:5`) — may not be traced/bundled on Vercel serverless; verify with `outputFileTracingIncludes` or run migrations only via CI/script.
34. **Delete `/api/admin/migrate`** — ad-hoc inline DDL that already drifts from the migration files, and returns `success: true` while per-step errors hide in `results`. `/api/admin/run-migrations` is the real path.

### Frontend

35. **`/api/read/salon` fetched 3× per `/book` visit** — `salon-context.tsx:147-154` fetches it; `fetchWorkingHours()` fetches it again (`data.ts:342-357`); `qwen-booking-flow.tsx:71` calls `refreshSalonData()` on mount (2 more). Fix: derive hours from one fetch; delete the mount refresh.
36. **Three divergent uncached polling policies** — 60s poll in `/book`, 10s poll+visibility+focus in `/bookings` and `/owner`. Fix: one shared `useBookingsPolling` hook, or SWR.
37. **Slot computation on every render trigger** — `qwen-booking-flow.tsx:250-285` runs `generateTimeSlots` for all 14 strip days on every dep change (including the 60s poll) even on the service step. Fix: memoize per date+selection or compute lazily.
38. **PullToRefresh never disarms** — `src/components/ui/pull-to-refresh.tsx:34-48` checks `containerRef.scrollTop` but the container isn't the scroll element (document scrolls) → pull is armed anywhere on the page. Fix: test `window.scrollY === 0`.
39. **Modal a11y gaps** — `MonthModal` (`qwen-booking-flow.tsx:938-998`) and AppHeader side menu (`app-header.tsx:154-241`): no focus trap, no Escape, no scroll lock — unlike every other sheet. Also nested `<Button>` inside header `<button>` in `highlights/page.tsx:218-262` (invalid HTML, hydration risk).
40. **Unlabeled icon buttons in owner screens** — `service-manager.tsx:275-289, 492-506` (move/edit/delete/activate), `booking-modal.tsx:92, 109-116`. Screen readers announce nothing.
41. **RTL physical utilities** — 43 `pl/pr/ml/mr` usages vs 5 logical ones; concrete bugs: `booking-modal.tsx:153` (`mr-auto` pushes the chip the wrong way vs `timeline.tsx:210`), `activity-log.tsx:143`, `highlights/page.tsx:220`, timeline gutter `left-0/left-12` (`timeline.tsx:150-167`).
42. **iOS input zoom** — `.qbf-inp`/`.qbp-edit-input` at 14px (`globals.css:1314, 1421`) → Safari auto-zooms. Fix: 16px inputs.
43. **UX nits** — block-time "reason" collected then discarded (`block-time-modal.tsx:91-99` + `owner/page.tsx:138-141` `void reason`); English "Created at {time}" (`booking-modal.tsx:215`); Gregorian dates + device-local TZ in activity log (`activity-log.tsx:64-93`); raw Latin digits in highlights page; service/highlight delete without confirm dialog; `alert()` for upload failure instead of toast (`service-manager.tsx:564-565`).
44. **Timer leaks** — `timeline.tsx:121-126` scroll `setTimeout` uncleaned; `splash-screen.tsx:75-78` nested timeout uncleared.

### Tests

45. **The transactional write path has zero tests** — no tests for `booking/service.ts` (the atomic core), any auth lib, `otp-service.ts`, `migrate.ts`, or any API route; coverage `include` is `src/lib/**/*.ts` only with **no thresholds** (`vitest.config.ts:9-14`). The well-tested slot engine is the part least likely to double-book; the untested service layer is the part that can. Fix: tests for `createBooking` conflict paths first, then thresholds + include `src/app/api`.

---

## P3 — Low / polish

- `scheduled/**` naming: `STATUS_MAP` copy-pasted 3× (`bookings/page.tsx:17`, `bookings/[id]/page.tsx:14`, `profile/page.tsx:20`) while `lib/constants.ts` exports `STATUS_CONFIG`; `JALALI_MONTHS` ×2 vs `PERSIAN_MONTHS`; HH:MM→minutes math ×6. Consolidate.
- God components: `qwen-booking-flow.tsx` (1224 — extract TimeStep/ReviewStep/SuccessStep already in-file), `service-manager.tsx` (847 — ServicesTab/AddonsTab are ~85% duplicated → one `ListManager`), `qwen-customer-home.tsx` (845 — 3rd/4th hand-rolled sheet → consolidate on `ui/bottom-sheet.tsx`), `schedule-manager.tsx` (694 — 13 `useState` → `useReducer`), `owner/settings/page.tsx` (610 — 4 identical upload quadruplets → `useImageUpload` hook).
- Deps: dead `sms-typescript`, `html-to-image`, `date-fns`; heroicons + lucide both used (13 vs 46 imports) — standardize.
- Env hygiene: `.env.local.example` missing ~14 vars the code actually uses (`OWNER_SESSION_SECRET`, `CUSTOMER_SESSION_SECRET`, `SUPER_ADMIN_SESSION_SECRET`, `SALON_ID`, `FARAZSMS_*`, …) while listing dead `NEXTAUTH_SECRET`/`SMS_IR_SENDER_NUMBER`; **dead Supabase block in `.env.local` with a live-looking service-role key — rotate it and delete**.
- Repo: 176 `.agents/` files + `.claude` + `docs/*.html` tracked despite gitignore → `git rm -r --cached`; dead `hero-bg.webp`; parent-folder `nb-mig-check.tmp.js`; pre-push hook exists but `core.hooksPath` is not configured → `git config core.hooksPath .githooks`.
- Deploy scripts: `deploy-salon.sh`/`deploy-admin.sh` use removed `--name` CLI flag, don't set DB/secrets, and echo hardcoded URLs — legacy duplicates of the working `/api/admin/salons/deploy` wizard. Delete or rewrite.
- PWA/SEO: manifest icons are SVGs with fixed sizes, no `purpose:"maskable"`, `theme_color` disagrees with layout viewport themeColors, no `id`/`lang`/`dir`; no robots.txt (add one disallowing `/owner`, `/admin`, `/api`); no `metadataBase`/OG tags.
- `CSP script-src 'unsafe-inline' 'unsafe-eval'` in `next.config.ts:14` — move to nonces/hashes eventually.
- `google-auth.ts:6` hardcodes a personal Gmail as default admin and `nailbook-admin.vercel.app` as default URL — require explicit env, fail closed. (Google auth routes currently return 410 — consider deleting the dead lib.)
- `/api/config` publishes `SALON_ID`; `owner/settings` `NumberInput`/day-off grid lack labels/`aria-pressed`; owner pages start at `h2` with no `h1`; touch targets 28-40px in a few spots; `noUncheckedIndexedAccess` off; no `db:migrate` npm script.

---

## What's done well (keep these patterns)

1. **Atomic booking**: per-tenant/day `pg_advisory_xact_lock` + `SELECT … FOR UPDATE` + `ON CONFLICT DO NOTHING` + partial unique indexes (`008`, `012_tenant_booking_uniqueness`); 23505 → 409. Both customer and owner paths take the same lock.
2. **OTP system**: `crypto.randomInt`, 5-min expiry, atomic `DELETE … RETURNING` consumption (replay-proof under concurrency), race-proof attempt counter.
3. **Sessions**: timing-safe HMAC with length guards, NaN/zero/future-timestamp rejection, Web Crypto mirror in middleware, **per-request DB role checks** for every owner route (role revocation is instant), real revocation via session-version bump on logout.
4. **Timezone care**: cached `Intl.DateTimeFormat` for Asia/Tehran, UTC-noon-anchored Gregorian keys (display never drifts a day), correct post-2022 no-DST handling.
5. **No price/duration tampering surface**: effective duration re-derived server-side from DB; addons must belong to the service; price never accepted from the client; phone normalized from Persian/Arabic digits server-side and bound to the session.
6. **PII discipline on public endpoints**: unauthenticated `/api/read/bookings` returns only intervals, no names/phones; backup/export use explicit column lists (no PINs/hashes).
7. **Structured booking errors** with Persian messages + machine codes; client detects conflicts and refreshes availability.
8. **Migration runner**: single transaction + advisory lock + per-file tracking + legacy table reconciliation.
9. **Frontend discipline**: optimistic mutations with rollback and request-ID staleness guards; double-submit refs on booking confirm and OTP; `100dvh` everywhere (zero `100vh`), safe-area insets, zoom-permitted viewport; customer sheets have focus trap + Escape + scroll lock + reduced-motion; `next/dynamic` for owner modals.
10. **Quality gates**: `npm run check` (lint + strict tsc + 98 tests) all green.

---

## Suggested order of work

**Wave 1 — security & trust (days)**
1. Fix #1 (owner takeover) and #2 (cross-tenant update) — small diffs, huge risk reduction.
2. Fix #3 (past-date validation) and #5 (false cancel toast).
3. Resolve #4 (SMS provider) and verify OTP delivery in production end-to-end.
4. Enforce `locked_until` (#7), make bootstrap/super-admin rate-limited + timing-safe (#8, #9).

**Wave 2 — booking correctness (1–2 weeks)**
5. `reserved` TTL + expiry (#15), reopen race lock (#16), unify tenant resolution (#17).
6. Customer cancel restrictions (#21), anti-spam fixes (#23), earnings price snapshot (#22).
7. Delete dead engine code (#18) — `scheduler/`, `/api/book/reserve`, `jalali-calendar.tsx` — after confirming with git history nothing references them.

**Wave 3 — quality & maintainability (ongoing)**
8. Tests for `booking/service.ts` + auth + otp (#45), then coverage thresholds.
9. Migration hygiene (#29–#34): renumber, idempotency, delete `/api/admin/migrate`.
10. Frontend consolidation: one sheet primitive, one STATUS_MAP, one polling hook, extract god components (#35–#37, P3 dedup list).
11. a11y/RTL pass (#39–#42) and mobile polish.

**Wave 4 — product upgrades (after waves 1–2)**
12. Server-side slot generation endpoint (#19) as the single source of availability truth.
13. Spec v7 conformance items (#20) if the density model matters to the business.
14. Waitlist (after `salon_id` fix), price snapshots, PWA install polish, robots/OG metadata.
