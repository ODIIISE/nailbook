@AGENTS.md

# Project Rules — NailBook Booking Platform

## Prompt Shortcuts

When you see these keywords in a user message, expand them automatically:

| Keyword | Expands To |
|---------|-----------|
| `bp` | "Use best practices, modern strategies, and clean code principles" |
| `rtl` | "Ensure full RTL support, Persian text, and right-to-left layout" |
| `secure` | "Follow OWASP security guidelines, validate inputs, sanitize outputs" |
| `perf` | "Optimize for performance: lazy load, memoize, minimize re-renders" |
| `a11y` | "Follow WCAG accessibility guidelines: semantic HTML, ARIA labels, keyboard nav" |
| `test` | "Write tests for all new code, run existing tests, ensure nothing breaks" |
| `clean` | "Keep code DRY, minimal, well-named, no unnecessary abstractions" |

Example: "add a login page `bp` `secure`" → "add a login page, use best practices, modern strategies, clean code principles, follow OWASP security guidelines, validate inputs, sanitize outputs"

## CRITICAL: Before Changing Any Function/API

1. **Grep for ALL callers** before modifying any function signature, API response, or data format. Use `grep -r "functionName\|/api/endpoint"` to find every consumer.
2. **Never remove fields from API responses** — other code depends on them. Add new fields instead.
3. **Never change data formats** (e.g., token structure, hash format) without backward compatibility. Old data in the database must still work.
4. **Never add queries for columns that may not exist** — run migrations first or use `ALTER TABLE IF NOT EXISTS`.

## Testing Rules

1. **Run `npm run test` after EVERY change** — all 65 tests must pass.
2. **Run `npm run build` after EVERY change** — build must succeed.
3. If you break a test, fix it — don't skip it.

## Booking Flow — Do Not Touch Without Understanding

The booking flow has 4 user states that must ALL work:
- Logged-in user → skips auth → confirm
- Existing user, not logged in → check-phone → verify-PIN → confirm
- Existing user without PIN → check-phone → create-PIN → confirm
- New user → check-phone → create-PIN → confirm

The `check-phone` endpoint MUST return `{ exists: boolean, hasPin: boolean }` — the booking flow routes on `hasPin`.

## Auth System — Backward Compatibility Required

- Session tokens: 3-part (legacy) and 4-part (versioned) must BOTH be accepted
- PIN hashes: SHA-256 (legacy) and pbkdf2+salt (new) must BOTH be verified
- Never hardcode fallback secrets — fail in production, warn in dev

## Database

- Never reference a column in SQL that might not exist in production
- Use `ALTER TABLE IF NOT EXISTS` for new columns
- Migrations are in `src/db/migrations/` — they run via `/api/owner/migrate`
