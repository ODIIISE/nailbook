# AUDIT-015 — Live Verification Walks (real device paths, no real SMS)

## Why this audit exists

Every prior audit (001–014) verified code paths with static analysis, unit tests,
and browser inspection against seeded/local states. Two things were never verified
end-to-end on production with real session machinery:

1. **Customer auth → booking → list → cancel**, with a real session cookie minted
   by the real `verify-otp` endpoint.
2. **Owner auth → timeline → status flips → schedule draft persistence → return routing.**

The blocker was SMS: logging in as a real user sends a real verification code to a
real phone. This audit removes that blocker with a **temporary, secret-gated test
hook** that mints test users + a fixed OTP code directly in the database — so every
step after the SMS step (the entire verify/session/booking machinery) runs for real.

## Ground rules (agreed with the product owner)

- Create fake users, run everything, then clean up. If something fails: fix, re-run, then clean.
- Zero SMS is sent: the client-side `send-otp` call is intercepted in the test browser
  (`window.fetch` override returning `{success:true}`); the fixed code `144535` then hits
  the **real** `/api/auth/verify-otp` endpoint. No server SMS path is ever invoked.
- The hook is an isolated route (`src/app/api/auth/test-mint/route.ts`) — zero edits to
  any real auth/booking code. Secret-gated (48-char secret; wrong secret → uniform 404).
- Cleanup deletes every created row (bookings, otps, users, activity log) and the hook
  file itself is deleted + reverted after the run. Residue report below.

## Walk plan

| # | Walk | Real machinery exercised | Pass criteria |
|---|------|--------------------------|---------------|
| P2 | Customer: browse `/book` at 375×667 → pick service → pick slot → confirm → success screen → bookings list → cancel | auto-create user, session cookie, booking insert, cancellation | success screen renders; booking appears with correct service/time; cancel removes it from active list; no console errors |
| P3 | Sold-out race: test owner creates a booking on slot S via real owner API; customer session retries slot S | owner booking insert + real 409 conflict path | customer sees red `role="alert"` banner, bounces to time step, slots refresh; the owner's booking remains the single source of truth |
| P4 | Owner: `/owner/login` with test owner phone → timeline renders → flip status (done/absent) → mark paid → edit schedule → reload | owner gate (pre-existing owner role), timeline queries, status/paid updates, schedule draft persistence | timeline shows the race booking; flips persist; draft survives reload; return-to routing lands correctly |

## Fixed-code login technique (no SMS, real session)

1. Hook `mint`s the user row (customer or owner) + an OTP row with code `144535`.
2. In the test browser, `window.fetch` is overridden to intercept **only**
   `/api/auth/send-otp` and return `{success:true}` — the UI believes a code was sent.
3. The operator types `144535` into the real PIN input → the real `verify-otp` route
   validates it against the real `otps` table → real 30-day session cookie is signed.
   Everything downstream is production code on production data.

## Residue report

Captured from the hook's `cleanup` action response (deleted rowCounts per table) and
recorded in `docs/AUDIT-015-live-verification.md` after the run. Success = all counts
accounted for, zero test phones remaining, hook file absent from repo.

## Honest limits

- The literal "SMS arrives on a phone" step is by definition not exercised (that is the
  one step the whole design exists to skip); its observable contract — that `send-otp`
  rate-limits (3/15min) and that `verify-otp` accepts only a code matching the `otps`
  row — is what the walks verify instead.
- Cancel is verified through the customer UI; refund/ledger side effects, if any exist
  in the domain, are out of scope for this walk and remain the owner's domain.
- The walks run against production data but only touch rows belonging to the two fake
  phone numbers (`09301112233`, `09304445566`) created by the hook.
