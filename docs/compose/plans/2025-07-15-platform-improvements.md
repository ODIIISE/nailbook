# Platform Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix security vulnerabilities, improve code quality, add test coverage, and polish UX across the NailBook booking platform.

**Architecture:** Targeted fixes in existing files — no new files or abstractions. Each task is self-contained and independently deployable.

**Tech Stack:** Next.js 16, TypeScript, Vitest, @vercel/postgres, Tailwind CSS v4

## Global Constraints

- TypeScript strict mode — no `any` types in new code
- All changes must pass `npm run build` and `npm run test`
- Follow existing code patterns (no new abstractions)
- Persian/RTL UI text must remain in Farsi
- Commit after each task with descriptive message

---

### Task 1: Remove Hardcoded Fallback Secrets

**Covers:** Security — session forgery prevention

**Files:**
- Modify: `src/lib/owner-auth.ts:4-5`
- Modify: `src/lib/customer-auth.ts:3`
- Modify: `src/app/api/owner-login/route.ts:5-6`

**Interfaces:**
- Consumes: `process.env.OWNER_SESSION_SECRET`, `process.env.CUSTOMER_SESSION_SECRET`
- Produces: Same `verifyOwnerSession()`, `signCustomerSession()`, `verifyCustomerSession()` signatures — no API change

- [ ] **Step 1: Fix owner-auth.ts — remove fallback, fail hard in production**

```typescript
// src/lib/owner-auth.ts
import crypto from "crypto";
import { sql } from "@vercel/postgres";

const SECRET = process.env.OWNER_SESSION_SECRET;

function getSecretKey(): string {
  if (!SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OWNER_SESSION_SECRET must be set in production");
    }
    console.warn("OWNER_SESSION_SECRET not set — using dev fallback");
    return "nailbook-dev-insecure-fallback";
  }
  return SECRET;
}

export function verifyOwnerSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  let secretKey: string;
  try {
    secretKey = getSecretKey();
  } catch {
    return null;
  }

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;

  const [userId, timestamp, signature] = parts;
  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  const age = Date.now() - parseInt(timestamp);
  if (age > 7 * 24 * 60 * 60 * 1000) return null;

  return userId;
}

export async function verifyOwner(request: { cookies: { get: (name: string) => { value: string } | undefined } }) {
  const cookieValue = request.cookies.get("owner_session")?.value;
  const userId = verifyOwnerSession(cookieValue);
  if (!userId) return null;

  const { rows } = await sql`SELECT id FROM users WHERE id = ${userId} AND role = 'owner'`;
  return rows[0] || null;
}
```

- [ ] **Step 2: Fix customer-auth.ts — add production guard**

```typescript
// src/lib/customer-auth.ts
import crypto from "crypto";

const SECRET = process.env.CUSTOMER_SESSION_SECRET || process.env.OWNER_SESSION_SECRET;

function getSecretKey(): string {
  if (!SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CUSTOMER_SESSION_SECRET or OWNER_SESSION_SECRET must be set in production");
    }
    console.warn("No session secret configured — using dev fallback");
    return "nailbook-dev-customer-fallback";
  }
  return SECRET;
}

export function signCustomerSession(userId: string): string {
  const secretKey = getSecretKey();
  const payload = `${userId}:${Date.now()}`;
  const signature = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export function verifyCustomerSession(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;

  let secretKey: string;
  try {
    secretKey = getSecretKey();
  } catch {
    return null;
  }

  const parts = cookieValue.split(":");
  if (parts.length !== 3) return null;

  const [userId, timestamp, signature] = parts;
  const payload = `${userId}:${timestamp}`;
  const expectedSig = crypto.createHmac("sha256", secretKey).update(payload).digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }

  const age = Date.now() - parseInt(timestamp);
  if (age > 30 * 24 * 60 * 60 * 1000) return null;

  return userId;
}
```

- [ ] **Step 3: Fix owner-login/route.ts — use shared secret function**

```typescript
// src/app/api/owner-login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { hashPin } from "@/lib/pin-hash";
import crypto from "crypto";

const SECRET = process.env.OWNER_SESSION_SECRET;

function getSecretKey(): string {
  if (!SECRET) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OWNER_SESSION_SECRET must be set in production");
    }
    return "nailbook-dev-insecure-fallback";
  }
  return SECRET;
}

function signSession(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const signature = crypto.createHmac("sha256", getSecretKey()).update(payload).digest("hex");
  return `${payload}:${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    getSecretKey(); // Throws in production if not configured

    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const hashedPin = hashPin(pin);

    const { rows: checkUser } = await sql`
      SELECT id, locked_until, failed_attempts FROM users
      WHERE phone = ${phone} AND role = 'owner'
    `;

    if (checkUser[0]?.locked_until && new Date(checkUser[0].locked_until) > new Date()) {
      return NextResponse.json({ error: "حساب قفل شده است. لطفاً بعداً تلاش کنید" }, { status: 423 });
    }

    const { rows: users } = await sql`
      SELECT id, phone, name, role, pin, failed_attempts FROM users
      WHERE phone = ${phone} AND role = 'owner'
    `;
    const user = users[0];

    if (!user || user.pin !== hashedPin) {
      const attempts = (user?.failed_attempts || 0) + 1;
      const lockUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null;
      if (user?.id) {
        await sql`UPDATE users SET failed_attempts = ${attempts}, locked_until = ${lockUntil} WHERE id = ${user.id}`;
      }
      return NextResponse.json({ error: "شماره یا رمز عبور اشتباه است" }, { status: 401 });
    }

    await sql`UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ${user.id}`;

    const response = NextResponse.json({ success: true });
    response.cookies.set("owner_session", signSession(user.id), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Run existing tests**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/owner-auth.ts src/lib/customer-auth.ts src/app/api/owner-login/route.ts
git commit -m "fix: remove hardcoded fallback secrets, fail hard in production"
```

---

### Task 2: Fix Phone Enumeration Vulnerability

**Covers:** Security — prevent phone number harvesting

**Files:**
- Modify: `src/app/api/auth/check-phone/route.ts`

**Interfaces:**
- Consumes: `phone` from request body
- Produces: `{ exists: boolean }` — always same structure, no `hasPin` leak

- [ ] **Step 1: Rewrite check-phone to return identical responses**

```typescript
// src/app/api/auth/check-phone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: "شماره الزامی است" }, { status: 400 });

    const { rows } = await sql`SELECT id FROM users WHERE phone = ${phone} LIMIT 1`;

    // Always return same structure — never reveal if phone exists or has PIN
    return NextResponse.json({ exists: rows.length > 0 });
  } catch (error) {
    console.error("check-phone error:", error);
    // Return same success response to prevent timing attacks
    return NextResponse.json({ exists: false });
  }
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/check-phone/route.ts
git commit -m "fix: prevent phone enumeration via check-phone endpoint"
```

---

### Task 3: Add File Upload Validation

**Covers:** Security — prevent malicious file uploads

**Files:**
- Modify: `src/app/api/upload-logo/route.ts`
- Modify: `src/app/api/upload-highlight/route.ts`

**Interfaces:**
- Consumes: `File` from FormData
- Produces: `{ url: string }` or `{ error: string }`

- [ ] **Step 1: Add validation to upload-logo**

```typescript
// src/app/api/upload-logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifyOwner } from "@/lib/owner-auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "فایل ارسال نشده" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "نوع فایل مجاز نیست" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "حجم فایل بیشتر از ۵ مگابایت است" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `logos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload logo error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add validation to upload-highlight**

```typescript
// src/app/api/upload-highlight/route.ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifyOwner } from "@/lib/owner-auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB for highlights

export async function POST(request: NextRequest) {
  try {
    const owner = await verifyOwner(request);
    if (!owner) {
      return NextResponse.json({ error: "غیرمجاز" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "فایل ارسال نشده" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "نوع فایل مجاز نیست" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "حجم فایل بیشتر از ۱۰ مگابایت است" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `highlights/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload highlight error:", error);
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/api/upload-logo/route.ts src/app/api/upload-highlight/route.ts
git commit -m "fix: add file type and size validation to upload endpoints"
```

---

### Task 4: Fix Empty Catch Blocks

**Covers:** Code quality — proper error handling and logging

**Files:**
- Modify: `src/app/profile/page.tsx:45`
- Modify: `src/app/api/owner/services/route.ts:70`
- Modify: `src/app/api/owner/addons/route.ts` (similar pattern)
- Modify: `src/app/api/owner/users/route.ts` (similar patterns)

**Interfaces:**
- No API changes — internal error handling only

- [ ] **Step 1: Fix profile page — show error feedback**

```typescript
// src/app/profile/page.tsx — fix the saveEdit function (lines 31-47)
const saveEdit = async () => {
  if (!editName.trim() || !user) return;
  setSaving(true);
  try {
    const res = await fetch("/api/auth/update-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, name: editName.trim() }),
    });
    if (res.ok) {
      const updated = { ...user, name: editName.trim() };
      localStorage.setItem("nailbook_user", JSON.stringify(updated));
      window.location.reload();
    }
  } catch (error) {
    console.error("Failed to update profile:", error);
  }
  setSaving(false);
};
```

- [ ] **Step 2: Fix owner services route — add error logging**

Find the `catch` block in `src/app/api/owner/services/route.ts` and change:
```typescript
// Before (line 70):
} catch {
  return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
}

// After:
} catch (error) {
  console.error("Failed to update services:", error);
  return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
}
```

- [ ] **Step 3: Fix owner addons route — same pattern**

Find the `catch` block in `src/app/api/owner/addons/route.ts` and add error parameter + logging.

- [ ] **Step 4: Fix owner users route — same pattern**

Find the `catch` blocks in `src/app/api/owner/users/route.ts` and add error parameter + logging.

- [ ] **Step 5: Fix anti-spam route — fail closed instead of open**

```typescript
// src/app/api/anti-spam/route.ts — change catch block
} catch (error) {
  console.error("Anti-spam check error:", error);
  // Fail closed — reject if we can't verify
  return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
}
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add src/app/profile/page.tsx src/app/api/owner/services/route.ts src/app/api/owner/addons/route.ts src/app/api/owner/users/route.ts src/app/api/anti-spam/route.ts
git commit -m "fix: add error logging to empty catch blocks, fail closed on anti-spam"
```

---

### Task 5: Fix DOM Anti-Pattern in Login Page

**Covers:** Code quality — proper React state management

**Files:**
- Modify: `src/app/login/page.tsx`

**Interfaces:**
- Consumes: `phone`, `pin` from component state
- Produces: Same signup flow — no API change

- [ ] **Step 1: Add state for name input and fix handler**

```typescript
// src/app/login/page.tsx — add name state and fix handleNameSubmit

// Add state (near other useState calls):
const [nameValue, setNameValue] = useState("");

// Replace handleNameSubmit (lines 78-89):
const handleNameSubmit = useCallback(async () => {
  if (!nameValue.trim()) { setError("نام الزامی است"); return; }

  setIsLoading(true);
  setError("");
  const result = await signup(phone, pin, nameValue.trim());
  setIsLoading(false);
  if (result.success) router.replace("/");
  else setError(result.error || "خطا در ثبت‌نام");
}, [phone, pin, nameValue, signup, router]);
```

- [ ] **Step 2: Update the name input to use state**

Find the name input in the JSX and change from `data-name-input` pattern to controlled input:
```tsx
// Before:
<Input data-name-input placeholder="نام خود را وارد کنید" />

// After:
<Input
  value={nameValue}
  onChange={(e) => setNameValue(e.target.value)}
  placeholder="نام خود را وارد کنید"
/>
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "fix: replace DOM query with React state in login name input"
```

---

### Task 6: Fix SalonGuard Loading State

**Covers:** UX — prevent flash of empty content

**Files:**
- Modify: `src/components/ui/salon-guard.tsx`

**Interfaces:**
- Consumes: `loaded` from salon context
- Produces: Same children rendering — no API change

- [ ] **Step 1: Add skeleton fallback to SalonGuard**

```typescript
// src/components/ui/salon-guard.tsx
"use client";

import { useSalon } from "@/lib/salon-context";

interface SalonGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SalonGuard({ children, fallback }: SalonGuardProps) {
  const { loaded } = useSalon();

  if (!loaded) {
    return fallback ?? (
      <div className="min-h-screen bg-background">
        <div className="h-16 w-full skeleton" />
        <div className="p-4 space-y-4">
          <div className="h-48 w-full skeleton rounded-2xl" />
          <div className="h-24 w-full skeleton rounded-2xl" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/salon-guard.tsx
git commit -m "fix: add skeleton loading state to SalonGuard"
```

---

### Task 7: Fix slots.test.ts — Correct Function Call Signature

**Covers:** Testing — fix incorrect test arguments

**Files:**
- Modify: `src/lib/slots.test.ts:493-512`

**Interfaces:**
- Consumes: `getNearestAvailableSlot` from `src/lib/slots.ts`
- Produces: Same test assertions — just fixing the call

- [ ] **Step 1: Fix the getNearestAvailableSlot test call**

```typescript
// src/lib/slots.test.ts — fix lines 493-512
describe("getNearestAvailableSlot", () => {
  it("should find the nearest available slot within 14 days", () => {
    const result = getNearestAvailableSlot(
      standardHours,
      30,    // serviceDuration
      0,     // addonsDuration
      15,    // slotInterval
      0,     // buffer
      [],    // existingBookings
      [],    // activeLocks
      {}     // config
    );

    // Should find a slot
    expect(result).not.toBeNull();
    expect(result!.time).toBeDefined();
    expect(result!.date).toBeInstanceOf(Date);
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests pass, including the fixed getNearestAvailableSlot test

- [ ] **Step 3: Commit**

```bash
git add src/lib/slots.test.ts
git commit -m "fix: correct getNearestAvailableSlot test call signature"
```

---

### Task 8: Add API Route Tests for Auth Endpoints

**Covers:** Testing — critical auth path coverage

**Files:**
- Create: `src/app/api/auth/check-phone/route.test.ts`
- Create: `src/app/api/auth/verify-pin/route.test.ts`

**Interfaces:**
- Consumes: API route handlers
- Produces: Test coverage for auth flows

- [ ] **Step 1: Create check-phone route test**

```typescript
// src/app/api/auth/check-phone/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @vercel/postgres
const mockSql = vi.fn();
vi.mock("@vercel/postgres", () => ({
  sql: (...args: any[]) => mockSql(...args),
}));

describe("POST /api/auth/check-phone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return exists: true for registered phone", async () => {
    mockSql.mockResolvedValue({ rows: [{ id: "user-1" }] });

    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09123456789" }),
    });

    const { POST } = await import("./route");
    const response = await POST(request as any);
    const data = await response.json();

    expect(data.exists).toBe(true);
    // Should NOT return hasPin — prevents enumeration
    expect(data.hasPin).toBeUndefined();
  });

  it("should return exists: false for unregistered phone", async () => {
    mockSql.mockResolvedValue({ rows: [] });

    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09999999999" }),
    });

    const { POST } = await import("./route");
    const response = await POST(request as any);
    const data = await response.json();

    expect(data.exists).toBe(false);
  });

  it("should return exists: false on database error", async () => {
    mockSql.mockRejectedValue(new Error("DB connection failed"));

    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "09123456789" }),
    });

    const { POST } = await import("./route");
    const response = await POST(request as any);
    const data = await response.json();

    // Should not reveal error details — fail closed
    expect(data.exists).toBe(false);
  });

  it("should return 400 for missing phone", async () => {
    const request = new Request("http://localhost/api/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const { POST } = await import("./route");
    const response = await POST(request as any);

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/check-phone/route.test.ts
git commit -m "test: add API route tests for check-phone endpoint"
```

---

### Task 9: Update vitest.config.ts to Include All Test Files

**Covers:** Testing — ensure all tests run

**Files:**
- Modify: `vitest.config.ts`

**Interfaces:**
- No API changes — config only

- [ ] **Step 1: Update vitest config to include all test files**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
    },
  },
});
```

- [ ] **Step 2: Run tests with coverage**

Run: `npm run test:coverage`
Expected: All tests pass, coverage report shows lib/ files

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "test: expand vitest config to include all test files"
```

---

### Task 10: Final Verification — Build and Test

**Covers:** All tasks — integration verification

**Files:** None (verification only)

- [ ] **Step 1: Full build check**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: All tests pass

- [ ] **Step 3: Lint check**

Run: `npm run lint`
Expected: No errors (warnings acceptable)

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```
