@AGENTS.md

# Project Rules — NailBook Booking Platform

## Prompt Shortcuts

| Keyword | Expands To |
|---------|-----------|
| `bp` | "Use best practices, modern strategies, and clean code principles" |
| `rtl` | "Ensure full RTL support, Persian text, and right-to-left layout" |
| `secure` | "Follow OWASP security guidelines, validate inputs, sanitize outputs" |
| `perf` | "Optimize for performance: lazy load, memoize, minimize re-renders" |
| `a11y` | "Follow WCAG accessibility guidelines: semantic HTML, ARIA labels, keyboard nav" |
| `test` | "Write tests for all new code, run existing tests, ensure nothing breaks" |
| `clean` | "Keep code DRY, minimal, well-named, no unnecessary abstractions" |

## CRITICAL: Before Changing Any Function/API

1. **Grep for ALL callers** before modifying any function signature, API response, or data format.
2. **Never remove fields from API responses** — other code depends on them. Add new fields instead.
3. **Never change data formats** without backward compatibility. Old data in the database must still work.
4. **Never add queries for columns that may not exist** — run migrations first or use `ALTER TABLE IF NOT EXISTS`.

## Testing Rules

1. **Run `npm run test` after EVERY change** — all 65 tests must pass.
2. **Run `npm run build` after EVERY change** — build must succeed.
3. If you break a test, fix it — don't skip it.

## Auth System

- **Customer PINs:** Plain 4-digit text (owner can see them in users list)
- **Owner PINs:** PBKDF2 hashed (secure, never visible)
- **Sessions:** HMAC-SHA256 signed cookies (httpOnly, secure, sameSite: lax)
- **Session tokens:** 3-part (legacy) and 4-part (versioned) must BOTH be accepted
- **Middleware:** Protects `/owner/*` and `/api/owner/*` routes
- **Owner login/logout:** Use `window.location.href` (full page reload), NOT `router.push`

## Booking Flow

The booking flow has 4 user states that must ALL work:
- Logged-in user → skips auth → confirm
- Existing user, not logged in → check-phone → verify-PIN → confirm
- Existing user without PIN → check-phone → create-PIN → confirm
- New user → check-phone → create-PIN → confirm

## Database

- Never reference a column in SQL that might not exist in production
- Use `ALTER TABLE IF NOT EXISTS` for new columns
- Migrations are in `src/db/migrations/` — they auto-run on salon data load. `/api/owner/migrate` is read-only (status check only).

## Security Checklist

Before shipping any change:
1. No secrets in client code — only in `.env.local` or server-side API routes
2. All API routes validate input — never trust client data
3. Cookies use `httpOnly`, `secure` (production), `sameSite: "lax"`
4. SQL uses parameterized queries — never string concatenation
5. User input is normalized (Persian/Arabic digits, country codes) before DB queries
6. Rate limiting on auth endpoints (PIN attempts, booking cooldowns)
7. CSRF protection on all state-changing routes (middleware handles this)

## Quality Gates

After every change, verify:
- `npm run test` — all tests pass
- `npm run build` — build succeeds, no TypeScript errors
- No console.error in production code paths (use devLog pattern)
- No unused imports or variables
- RTL layout preserved — use logical CSS (ps/pe, ms/me) not physical (pl/pr, ml/mr)
