# Code Review Report — Anti-Patterns Found

## Critical (2)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| E2 | Empty catch bypasses slot guard — booking created locally even on network error | `book/content.tsx:244` | Return early on catch, don't create booking |
| R2 | TOCTOU double-booking — slot validated then booking created without server lock | `book/content.tsx:216-268` | Await server confirmation before local insert |

## High (6)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| R1 | No AbortController in salon load — StrictMode double-mount overwrites data | `salon-context.tsx:65` | Add AbortController to useEffect cleanup |
| O1 | Optimistic write without rollback — working hours saved before DB | `salon-context.tsx:97` | Rollback state on DB failure |
| O2 | Same pattern for days off | `salon-context.tsx:102` | Same fix |
| O3 | Promise.all partial failure leaves inconsistent state | `salon-context.tsx:107` | Use sequential await or rollback |
| O4 | Phantom booking on server rejection | `salon-context.tsx:128` | Only append after server confirms |
| O5 | Unhandled fetch error on salon update | `salon-context.tsx:138` | Add try/catch with error feedback |

## Medium (8)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| E1 | Silent catch on blocked times | `salon-context.tsx:125` | Log error |
| E3 | Silent catch on fetchUsers | `owner/users/page.tsx:45` | Show error state |
| E4 | Silent catch on toggle block | `owner/users/page.tsx:216` | Toast error |
| M1 | Direct state mutation in handleMoveUp | `service-manager.tsx:94` | Map to new objects |
| D1 | Missing useMemo dependency | `salon-context.tsx:228` | Add handleUpdateBlockedTimes to deps |
| U1 | No AbortController cleanup | `salon-context.tsx:65` | Add cleanup flag |
| U2 | localStorage hydration mismatch | `owner/page.tsx:31` | Use useEffect for localStorage read |
| X1 | Empty date string in manual reserve | `owner/page.tsx:125` | Generate proper date |

## Low (6)

| # | Issue | File:Line | Fix |
|---|-------|-----------|-----|
| R3 | 30s poll overwrites optimistic state | `owner/page.tsx:48` | Skip poll if local changes pending |
| U3 | No debounce on localStorage writes | `owner/page.tsx:42` | Add debounce |
| I2 | pendingServices stale on parent re-render | `service-manager.tsx:71` | Use effect to sync |
| X2 | handleRemoveBlock uses index (fragile) | `owner/page.tsx:105` | Use unique ID |
| X3 | Inconsistent indentation | `salon-context.tsx:228` | Fix formatting |
| Category 9 | Magic numbers throughout slots.ts | Multiple | Extract to constants |
