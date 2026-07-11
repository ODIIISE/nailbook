# Hardmode Fix All Issues — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all critical security vulnerabilities, remove mock data, consolidate duplicate code, persist payment state to database, and enforce modern best practices across the entire NailBook codebase.

**Architecture:** Centralize PIN hashing in a shared utility. Replace TOCTOU booking flow with atomic server-side transaction. Add owner auth to unprotected endpoints. Remove all mock/fallback data. Persist payment state to DB.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vercel Postgres, Vercel Blob, Tailwind CSS v4

## Global Constraints

- All PINs must be SHA-256 hashed before storage (never plaintext)
- All owner-protected routes must call `verifyOwner(request)` 
- No mock/fallback data in production code
- No diagnostic endpoints exposed in production
- All writes must be atomic (no TOCTOU)
- Payment state stored in database, not localStorage
- Persian/Farsi RTL UI preserved throughout
- No breaking changes to existing API contracts (add fields, don't remove)

---

## File Structure

```
nailbook/
├── src/
│   ├── lib/
│   │   ├── pin-hash.ts              # NEW — centralized PIN hashing
│   │   ├── mock-data.ts             # DELETE types → move to types.ts
│   │   ├── types.ts                 # NEW — all TypeScript interfaces
│   │   ├── anti-spam.ts             # MODIFY — add per-user cooldown via DB
│   │   ├── salon-context.tsx        # MODIFY — remove MOCK_SALON references
│   │   ├── auth-context.tsx         # CHECK — no changes expected
│   │   └── db/data.ts              # MODIFY — update import paths
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── create-pin/route.ts    # MODIFY — hash PIN before insert
│   │   │   │   └── verify-pin/route.ts    # MODIFY — hash PIN before compare
│   │   │   ├── book/route.ts              # REWRITE — atomic booking with lock
│   │   │   ├── book/reserve/route.ts      # KEEP — slot validation only
│   │   │   ├── read/
│   │   │   │   ├── bookings/route.ts      # MODIFY — add owner auth
│   │   │   │   └── booking/route.ts       # MODIFY — remove (merge into book)
│   │   │   ├── owner/
│   │   │   │   ├── reset-pin/route.ts     # DELETE — consolidate into users/reset-pin
│   │   │   │   ├── users/reset-pin/route.ts  # MODIFY — hash PIN
│   │   │   │   └── diag/                  # DELETE — remove diagnostic routes
│   │   │   └── update-salon/route.ts      # KEEP
│   │   └── book/content.tsx               # MODIFY — remove Booking import from mock-data
│   └── components/booking/booking-confirm.tsx  # KEEP
```

---

### Task 1: Create Types Module and PIN Hash Utility

**Covers:** S1 (type safety), S2 (PIN security)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/pin-hash.ts`

**Interfaces:**
- Produces: `SalonInfo`, `Service`, `Addon`, `Booking`, `Highlight`, `HighlightImage` types; `hashPin()`, `verifyPin()` functions

- [ ] **Step 1: Create types.ts with all interfaces**

```typescript
// src/lib/types.ts
export interface SalonInfo {
  id: string;
  name: string;
  description: string;
  slogan: string;
  phone: string;
  address: string;
  hero_image_url: string | null;
  logo_url: string | null;
  working_hours_text: string;
  working_hours: {
    [key: string]: { open: string; close: string } | null;
  };
  specific_days_off?: string[];
  slot_buffer_minutes: number;
  slot_interval_minutes: number;
  early_extra_hours: number;
  late_extra_hours: number;
  expand_threshold: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  sort_order: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  sort_order: number;
  addon_ids: string[];
  priority_score: number;
}

export interface Booking {
  id: string;
  user_id?: string;
  service_id: string;
  selected_addons: string[];
  customer_name: string;
  customer_phone: string;
  date: string;
  date_gregorian: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  phone_verified: boolean;
  paid: boolean;
  created_at: string;
  service?: Service;
}

export interface HighlightImage {
  id: string;
  highlight_id: string;
  image_url: string;
  caption: string;
  sort_order: number;
}

export interface Highlight {
  id: string;
  name: string;
  cover_url: string | null;
  sort_order: number;
  images: HighlightImage[];
}
```

- [ ] **Step 2: Create pin-hash.ts**

```typescript
// src/lib/pin-hash.ts
import crypto from "crypto";

const ALGO = "sha256";

export function hashPin(pin: string): string {
  return crypto.createHash(ALGO).update(String(pin).trim()).digest("hex");
}

export function verifyPin(plaintext: string, storedHash: string): boolean {
  const computed = hashPin(plaintext);
  return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(storedHash, "hex"));
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to new files

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/pin-hash.ts
git commit -m "feat: add centralized types module and PIN hashing utility"
```

---

### Task 2: Migrate All Imports from mock-data to types.ts

**Covers:** S1 (remove mock data), S3 (type consistency)

**Files:**
- Modify: `src/lib/salon-context.tsx` (lines 4-5)
- Modify: `src/lib/db/data.ts` (line 1)
- Modify: `src/app/book/content.tsx` (line 23)
- Modify: `src/lib/slots.ts` (check imports)
- Delete: `src/lib/mock-data.ts` (after all imports migrated)

**Interfaces:**
- Consumes: `SalonInfo`, `Service`, `Addon`, `Booking`, `Highlight`, `HighlightImage` from `types.ts`

- [ ] **Step 1: Update salon-context.tsx imports**

Replace:
```typescript
import { MOCK_SALON } from "@/lib/mock-data";
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "@/lib/mock-data";
```
With:
```typescript
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "@/lib/types";
```

- [ ] **Step 2: Update salon-context.tsx — remove MOCK_SALON usage**

Replace `useState<SalonInfo>(MOCK_SALON)` with `useState<SalonInfo | null>(null)`.

Replace the `loaded === false` return block that uses `MOCK_SALON` with a proper loading state (show skeleton or null).

In the `value` memo, handle `salon === null` case:
```typescript
if (!loaded || !salon) {
  return { /* loading defaults, no mock data */ };
}
```

- [ ] **Step 3: Update db/data.ts import**

Replace:
```typescript
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "../mock-data";
```
With:
```typescript
import type { SalonInfo, Service, Booking, Addon, Highlight, HighlightImage } from "../types";
```

- [ ] **Step 4: Update book/content.tsx import**

Replace:
```typescript
import type { Booking } from "@/lib/mock-data";
```
With:
```typescript
import type { Booking } from "@/lib/types";
```

- [ ] **Step 5: Find and update ALL other files importing from mock-data**

Run: `grep -r "mock-data" src/ --include="*.ts" --include="*.tsx"`

Update every file found to import from `@/lib/types` instead.

- [ ] **Step 6: Delete mock-data.ts**

```bash
rm src/lib/mock-data.ts
```

- [ ] **Step 7: Verify build passes**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor: migrate all types to types.ts, remove mock-data.ts"
```

---

### Task 3: Hash All Customer PINs (create-pin + verify-pin)

**Covers:** S2 (PIN security — customer flow)

**Files:**
- Modify: `src/app/api/auth/create-pin/route.ts`
- Modify: `src/app/api/auth/verify-pin/route.ts`

**Interfaces:**
- Consumes: `hashPin()`, `verifyPin()` from `pin-hash.ts`

- [ ] **Step 1: Fix create-pin/route.ts**

Replace the PIN storage lines. The current code stores `cleanPin` directly. Change to:

```typescript
import { hashPin } from "@/lib/pin-hash";

// In the UPDATE for existing user without PIN:
await sql`UPDATE users SET pin = ${hashPin(cleanPin)}, name = ${trimmedName} WHERE id = ${existing[0].id}`;

// In the INSERT for new user:
await sql`
  INSERT INTO users (id, phone, pin, name, role)
  VALUES (${userId}, ${phone}, ${hashPin(cleanPin)}, ${trimmedName}, 'customer')
`;
```

- [ ] **Step 2: Fix verify-pin/route.ts**

Replace plaintext comparison with hash verification:

```typescript
import { verifyPin } from "@/lib/pin-hash";

// Replace: if (user.pin !== String(pin).trim())
// With:
if (!verifyPin(String(pin).trim(), user.pin)) {
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/create-pin/route.ts src/app/api/auth/verify-pin/route.ts
git commit -m "security: hash customer PINs with SHA-256 before storage"
```

---

### Task 4: Hash PINs in Owner Reset-Endpoints and Consolidate

**Covers:** S2 (PIN security — owner flow), S4 (remove duplicate endpoints)

**Files:**
- Modify: `src/app/api/owner/users/reset-pin/route.ts`
- Delete: `src/app/api/owner/reset-pin/route.ts`

**Interfaces:**
- Consumes: `hashPin()` from `pin-hash.ts`

- [ ] **Step 1: Fix users/reset-pin/route.ts to hash PIN**

```typescript
import { hashPin } from "@/lib/pin-hash";

// Replace: await sql`UPDATE users SET pin = ${String(pin)} WHERE id = ${userId} RETURNING id, pin`
// With:
const { rows } = await sql`
  UPDATE users SET pin = ${hashPin(String(pin))}, failed_attempts = 0, locked_until = NULL
  WHERE id = ${userId} RETURNING id
`;
```

- [ ] **Step 2: Delete the duplicate reset-pin route**

```bash
rm src/app/api/owner/reset-pin/route.ts
```

- [ ] **Step 3: Check if anything imports from the deleted route**

Run: `grep -r "owner/reset-pin" src/ --include="*.ts" --include="*.tsx"`

If found, update to use `/api/owner/users/reset-pin` instead.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "security: hash PINs in owner reset endpoint, remove duplicate route"
```

---

### Task 5: Remove Diagnostic Routes

**Covers:** S5 (remove debug endpoints)

**Files:**
- Delete: `src/app/api/owner/diag/pin-test/route.ts`
- Delete: `src/app/api/owner/diag/` directory

**Interfaces:**
- None (pure deletion)

- [ ] **Step 1: Delete diagnostic route**

```bash
rm -rf src/app/api/owner/diag/
```

- [ ] **Step 2: Verify no imports reference diag**

Run: `grep -r "diag" src/ --include="*.ts" --include="*.tsx"`

If found, remove the references.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "security: remove diagnostic routes that expose PIN hashes"
```

---

### Task 6: Atomic Booking — Prevent TOCTOU Double-Booking

**Covers:** S6 (atomic booking), S7 (empty catch fix)

**Files:**
- Rewrite: `src/app/api/book/route.ts`

**Interfaces:**
- Consumes: `hashPin` (not needed here, but consistent import pattern)
- Produces: atomic booking creation with conflict check + insert in single transaction

- [ ] **Step 1: Rewrite book/route.ts with atomic transaction**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  let client;
  try {
    const { phone, service_id, date_gregorian, start_time, end_time, customer_name, selected_addons, user_id } =
      await request.json();

    if (!phone || !service_id || !date_gregorian || !start_time || !end_time) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    // Use a single transaction to check conflicts AND insert atomically
    client = await sql.connect();
    await client.query("BEGIN");

    // Lock existing bookings for this time range (SELECT ... FOR UPDATE)
    const conflictCheck = await client.query(
      `SELECT id FROM bookings
       WHERE date_gregorian = $1::date
       AND status = 'confirmed'
       AND start_time <= $2
       AND end_time >= $3
       FOR UPDATE`,
      [date_gregorian, end_time, start_time]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "این زمان قبلاً رزرو شده", conflict: true },
        { status: 409 }
      );
    }

    // Check blocked times (also under lock)
    const blockedCheck = await client.query(
      `SELECT id FROM blocked_times
       WHERE date_gregorian = $1::date
       AND start_time <= $2
       AND end_time >= $3`,
      [date_gregorian, end_time, start_time]
    );

    if (blockedCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "این زمان مسدود شده", conflict: true },
        { status: 409 }
      );
    }

    // Insert booking
    const jalaliDate = await client.query(
      `INSERT INTO bookings (
        user_id, customer_phone, customer_name, service_id,
        selected_addons, date_gregorian, start_time, end_time,
        status, phone_verified, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, 'confirmed', true, NOW())
      RETURNING id`,
      [
        user_id || null,
        phone,
        customer_name || "",
        service_id,
        JSON.stringify(selected_addons || []),
        date_gregorian,
        start_time,
        end_time,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: "Booking confirmed",
      booking_id: jalaliDate.rows[0].id,
    });
  } catch (error: any) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch {}
    }

    if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
      return NextResponse.json(
        { error: "این زمان همین الان رزرو شد. لطفاً زمان دیگری را انتخاب کنید." },
        { status: 409 }
      );
    }

    console.error("Booking failed:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  } finally {
    if (client) client.release();
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/book/route.ts
git commit -m "fix: atomic booking with SELECT FOR UPDATE to prevent TOCTOU double-booking"
```

---

### Task 7: Add Owner Auth to Bookings Endpoint

**Covers:** S8 (auth on bookings endpoint)

**Files:**
- Modify: `src/app/api/read/bookings/route.ts`

**Interfaces:**
- Consumes: `verifyOwner()` from `owner-auth.ts`

- [ ] **Step 1: Add owner auth check to GET /api/read/bookings**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function GET(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const { rows } = await sql`
      SELECT id, service_id, selected_addons, customer_name, customer_phone,
             date, date_gregorian::text as date_gregorian, start_time, end_time, status, paid,
             phone_verified, created_at
      FROM bookings
      ORDER BY created_at DESC
    `;
    const normalized = rows.map((r) => ({
      ...r,
      date_gregorian: r.date_gregorian ? r.date_gregorian.split("T")[0] : r.date_gregorian,
    }));
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/read/bookings/route.ts
git commit -m "security: add owner auth check to bookings endpoint"
```

---

### Task 8: Persist Payment State to Database

**Covers:** S9 (payment state persistence)

**Files:**
- Modify: `src/app/api/owner/services/route.ts` (or create new endpoint for paid toggle)
- Modify: Owner dashboard to use DB-backed paid state

**Interfaces:**
- Produces: `PATCH /api/owner/bookings/:id/paid` endpoint

- [ ] **Step 1: Create paid-toggle endpoint**

```typescript
// src/app/api/owner/bookings/paid/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { verifyOwner } from "@/lib/owner-auth";

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });

    const { bookingId, paid } = await request.json();
    if (!bookingId || typeof paid !== "boolean") {
      return NextResponse.json({ error: "داده ناقص" }, { status: 400 });
    }

    await sql`UPDATE bookings SET paid = ${paid} WHERE id = ${bookingId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update paid error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update salon-context.tsx to persist paid state**

Add a `toggleBookingPaid` function to the context that calls the new endpoint.

- [ ] **Step 3: Update owner dashboard to use context for paid toggle**

Remove localStorage reads for `owner_paid_bookings`. Use the `paid` field from the booking object directly (now persisted in DB).

- [ ] **Step 4: Verify build passes**

Run: `npm run build 2>&1 | tail -10`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: persist booking payment state to database instead of localStorage"
```

---

### Task 9: Fix Anti-Spam to Use Per-User Cooldown

**Covers:** S10 (anti-spam improvement)

**Files:**
- Modify: `src/lib/anti-spam.ts`

**Interfaces:**
- Consumes: SQL queries via `@vercel/postgres`

- [ ] **Step 1: Fix timezone handling in anti-spam**

The current code uses `new Date()` which is server timezone, not Tehran. Fix to use proper Tehran date:

```typescript
import { sql } from "@vercel/postgres";

const MAX_BOOKINGS_PER_DAY = 3;
const COOLDOWN_MINUTES = 120;

export interface AntiSpamResult {
  allowed: boolean;
  error?: string;
}

export async function checkAntiSpam(phone: string): Promise<AntiSpamResult> {
  // Get today in Tehran timezone
  const now = new Date();
  const tehranOffset = 3.5 * 60 * 60 * 1000;
  const tehranDate = new Date(now.getTime() + tehranOffset);
  const todayStr = tehranDate.toISOString().split("T")[0];

  const { rows } = await sql`
    SELECT COUNT(*) as count FROM bookings
    WHERE customer_phone = ${phone}
    AND date_gregorian = ${todayStr}::date
    AND status IN ('confirmed', 'pending')
  `;
  const todayBookings = parseInt(rows[0]?.count || "0");

  if (todayBookings >= MAX_BOOKINGS_PER_DAY) {
    return {
      allowed: false,
      error: `شما امروز قبلاً ${MAX_BOOKINGS_PER_DAY} رزرو انجام داده‌اید. لطفاً فردا تلاش کنید.`,
    };
  }

  const cooldownTime = new Date(now.getTime() - COOLDOWN_MINUTES * 60_000);

  const { rows: recentRows } = await sql`
    SELECT created_at FROM bookings
    WHERE customer_phone = ${phone}
    AND created_at >= ${cooldownTime.toISOString()}
    AND status IN ('confirmed', 'pending')
    ORDER BY created_at DESC
    LIMIT 1
  `;

  if (recentRows[0]) {
    const lastBookingTime = new Date(recentRows[0].created_at);
    const minutesSince = Math.floor((Date.now() - lastBookingTime.getTime()) / 60_000);
    const minutesLeft = COOLDOWN_MINUTES - minutesSince;

    return {
      allowed: false,
      error: `لطفاً ${minutesLeft} دقیقه دیگر صبر کنید و دوباره تلاش کنید.`,
    };
  }

  return { allowed: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/anti-spam.ts
git commit -m "fix: use Tehran timezone for anti-spam date calculations"
```

---

### Task 10: Clean Up Owner Login to Use Shared hashPin

**Covers:** S11 (code consolidation)

**Files:**
- Modify: `src/app/api/owner-login/route.ts`

**Interfaces:**
- Consumes: `hashPin()` from `pin-hash.ts`

- [ ] **Step 1: Replace local hashPin with shared utility**

Remove the local `hashPin` function and import from `pin-hash.ts`:

```typescript
import { hashPin } from "@/lib/pin-hash";
// Remove: function hashPin(pin: string): string { ... }
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/owner-login/route.ts
git commit -m "refactor: use shared pin-hash utility in owner login"
```

---

### Task 11: Remove Unused Sessions Table Reference

**Covers:** S12 (cleanup)

**Files:**
- Modify: `supabase/schema.sql` (remove sessions table if not needed)

**Interfaces:**
- None

- [ ] **Step 1: Check if sessions table is used anywhere**

Run: `grep -r "sessions" src/ supabase/ --include="*.ts" --include="*.sql" | grep -v node_modules`

- [ ] **Step 2: If unused, remove from schema.sql**

The `sessions` table is defined but never used by the app. Remove it from the schema.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "cleanup: remove unused sessions table from schema"
```

---

### Task 12: Final Build Verification and Cleanup

**Covers:** S13 (verification)

**Files:**
- None (verification only)

**Interfaces:**
- None

- [ ] **Step 1: Full build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds with no errors

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 3: Verify no mock-data references remain**

Run: `grep -r "mock-data\|MOCK_SALON\|MOCK_" src/ --include="*.ts" --include="*.tsx"`
Expected: No output

- [ ] **Step 4: Verify no plaintext PIN storage**

Run: `grep -r "pin = \${" src/app/api/ --include="*.ts" | grep -v hashPin`
Expected: No direct PIN storage without hashing

- [ ] **Step 5: Verify all owner routes have auth**

Run: `grep -rL "verifyOwner" src/app/api/owner/ --include="*.ts"`
Expected: Only non-mutation routes (GET) might lack auth; all POST/PUT/DELETE must have it

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```
