# Code Cleanup + Bug Fixes + UX Polish Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up code duplication, fix known bugs, and polish UX across the NailBook app.

**Architecture:** Extract shared utilities/hooks from duplicated code, fix CSS and logic bugs, add missing UX patterns (swipe-to-dismiss, empty states, scroll-to-now, pause-on-touch).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, TypeScript

---

## Global Constraints

- All animations respect `prefers-reduced-motion: reduce`
- RTL layout must be preserved — all new code must be RTL-compatible
- Persian/Farsi text for all user-facing strings
- Touch targets minimum 44×44pt
- Run `npm run test` after every change — all tests must pass
- Run `npm run build` after every change — build must succeed
- No new dependencies unless absolutely necessary
- Follow existing patterns — glassmorphism style, Vazirmatn font, shadcn/ui components

---

## Phase 1: Code Cleanup — Extract Shared Utilities

### Task 1: Extract useHorizontalDrag hook

**Covers:** Dedup touch drag + wheel scroll handlers from `jalali-calendar.tsx` and `highlights.tsx`

**Files:**
- Create: `src/lib/hooks/use-horizontal-drag.ts`
- Modify: `src/components/booking/jalali-calendar.tsx`
- Modify: `src/components/landing/highlights.tsx`

**Interfaces:**
- Produces: `useHorizontalDrag(ref: RefObject<HTMLElement>)` — attaches touch drag and wheel scroll handlers to a scrollable element

- [ ] **Step 1: Create the shared hook**

```typescript
// src/lib/hooks/use-horizontal-drag.ts
"use client";

import { useRef, useEffect, useCallback } from "react";

export function useHorizontalDrag<T extends HTMLElement>(
  scrollRef: React.RefObject<T | null>
) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const touchStartY = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  }, [scrollRef]);

  const onMouseLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || !scrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX.current) * 1.5;
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
    },
    [scrollRef]
  );

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    startX.current = e.touches[0].pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    touchStartY.current = e.touches[0].pageY;
  }, [scrollRef]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || !scrollRef.current) return;
      const x = e.touches[0].pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX.current) * 1.5;
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
    },
    [scrollRef]
  );

  const onTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft -= e.deltaY;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollRef]);

  return {
    onMouseDown,
    onMouseLeave,
    onMouseUp,
    onMouseMove,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
```

- [ ] **Step 2: Update jalali-calendar.tsx to use the hook**

Remove the duplicated refs (`isDragging`, `startX`, `scrollLeft`, `touchStartY`) and handlers (`onMouseDown`, `onMouseLeave`, `onMouseUp`, `onMouseMove`, `onTouchStart`, `onTouchMove`, `onTouchEnd`), and the `useEffect` for the wheel handler. Replace with:

```typescript
import { useHorizontalDrag } from "@/lib/hooks/use-horizontal-drag";
// ... inside component:
const scrollRef = useRef<HTMLDivElement>(null);
const dragHandlers = useHorizontalDrag(scrollRef);
// Spread onto the scrollable div: {...dragHandlers}
```

- [ ] **Step 3: Update highlights.tsx to use the hook**

Same extraction — remove duplicated refs/handlers/wheel effect, replace with `useHorizontalDrag`.

- [ ] **Step 4: Run tests and build**

Run: `npm run test && npm run build`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/use-horizontal-drag.ts src/components/booking/jalali-calendar.tsx src/components/landing/highlights.tsx
git commit -m "refactor: extract shared useHorizontalDrag hook from calendar and highlights"
```

---

### Task 2: Extract STATUS_CONFIG constant

**Covers:** Dedup `STATUS_CONFIG` from `timeline.tsx` and `booking-modal.tsx`

**Files:**
- Create: `src/lib/constants.ts`
- Modify: `src/components/owner/timeline.tsx`
- Modify: `src/components/owner/booking-modal.tsx`

**Interfaces:**
- Produces: `STATUS_CONFIG` — shared status label/color map for booking statuses

- [ ] **Step 1: Create shared constants file**

```typescript
// src/lib/constants.ts
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  reserved: { label: "رزرو شده", color: "#2563EB", bg: "#EFF6FF" },
  confirmed: { label: "تأیید شده", color: "#059669", bg: "#ECFDF5" },
  completed: { label: "انجام شده", color: "#7C3AED", bg: "#F5F3FF" },
  cancelled: { label: "لغو شده", color: "#DC2626", bg: "#FEF2F2" },
  no_show: { label: "حضور نیافت", color: "#D97706", bg: "#FFFBEB" },
};
```

- [ ] **Step 2: Update timeline.tsx**

Remove the local `STATUS_CONFIG` object and import from `@/lib/constants`.

- [ ] **Step 3: Update booking-modal.tsx**

Remove the local `STATUS_CONFIG` object and import from `@/lib/constants`. Merge any status options that were missing (add `cancelled` and `no_show` to the dropdown if not present).

- [ ] **Step 4: Run tests and build**

Run: `npm run test && npm run build`

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/components/owner/timeline.tsx src/components/owner/booking-modal.tsx
git commit -m "refactor: extract shared STATUS_CONFIG constant"
```

---

### Task 3: Fix trust-signals.tsx formatPrice misuse

**Covers:** Replace `formatPrice` with proper number formatting in trust signals

**Files:**
- Modify: `src/components/landing/trust-signals.tsx`

- [ ] **Step 1: Fix the formatting**

Replace `formatPrice(totalBookings)` with `toPersianDigits(totalBookings.toLocaleString("fa-IR"))` or use the existing `toPersianDigits` with `Intl.NumberFormat`.

```typescript
import { toPersianDigits } from "@/lib/jalali";
// ...
<p>{toPersianDigits(Intl.NumberFormat("fa-IR").format(totalBookings))}</p>
```

- [ ] **Step 2: Run tests and build**

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/trust-signals.tsx
git commit -m "fix: use proper number formatting for booking count in trust signals"
```

---

## Phase 2: Bug Fixes

### Task 4: Fix CSS bug in activity-log.tsx

**Covers:** Fix `text[#7B1FA2]` missing bracket on line 35

**Files:**
- Modify: `src/components/owner/activity-log.tsx`

- [ ] **Step 1: Fix the class**

Find the `addon_updated` event styling and fix `text[#7B1FA2]` to `text-[#7B1FA2]`.

- [ ] **Step 2: Run tests and build**

- [ ] **Step 3: Commit**

```bash
git add src/components/owner/activity-log.tsx
git commit -m "fix: correct CSS class syntax for addon_updated event color"
```

---

### Task 5: Fix highlight-viewer.tsx performance

**Covers:** Replace 50ms setInterval with CSS animation or requestAnimationFrame

**Files:**
- Modify: `src/components/landing/highlight-viewer.tsx`

- [ ] **Step 1: Replace setInterval with CSS-based progress**

Replace the 50ms `setInterval` progress update with a CSS animation approach. Use a single `requestAnimationFrame` or a CSS `@keyframes` animation on the progress bar, and trigger the slide change via `onAnimationEnd` or a single timer.

Key changes:
- Remove `setInterval(tick, 50)` 
- Use a CSS transition on the progress bar width with `transition: width 5s linear`
- Use a single `setTimeout` for the slide advance at the end of the interval
- On user interaction (tap/hold), pause by removing the CSS transition

- [ ] **Step 2: Add pause-on-touch**

When user touches and holds on the story, pause the auto-advance timer. Resume on touch end. Use `onTouchStart`/`onTouchEnd` to toggle a `isPaused` state.

- [ ] **Step 3: Run tests and build**

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/highlight-viewer.tsx
git commit -m "fix: replace wasteful setInterval with CSS animation in highlight viewer, add pause-on-touch"
```

---

### Task 6: Fix image-crop.tsx promise hang

**Covers:** Add error handling to `getCroppedImg`

**Files:**
- Modify: `src/components/ui/image-crop.tsx`

- [ ] **Step 1: Add onerror handler**

```typescript
const image = new Image();
image.onload = () => {
  // ... existing crop logic
  resolve(blob);
};
image.onerror = () => {
  reject(new Error("Failed to load image"));
};
image.src = URL.createObjectURL(imageFile);
```

- [ ] **Step 2: Add loading state to the component**

Show a loading indicator while the image is being cropped (when `croppedAreaPixels` is set but the crop hasn't been confirmed yet).

- [ ] **Step 3: Run tests and build**

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/image-crop.tsx
git commit -m "fix: add error handling to getCroppedImg to prevent hanging promises"
```

---

### Task 7: Fix customer-auth.ts secret fallback

**Covers:** Prevent session cross-use between customer and owner

**Files:**
- Modify: `src/lib/customer-auth.ts`

- [ ] **Step 1: Remove the fallback**

Remove the line that falls back to `OWNER_SESSION_SECRET` when `CUSTOMER_SESSION_SECRET` is not set. Instead, throw an error in production or use a dev-only fallback.

```typescript
const SECRET = process.env.CUSTOMER_SESSION_SECRET 
  ?? (process.env.NODE_ENV === "development" 
    ? "nailbook-dev-customer-fallback" 
    : (() => { throw new Error("CUSTOMER_SESSION_SECRET is required in production"); })());
```

- [ ] **Step 2: Run tests and build**

- [ ] **Step 3: Commit**

```bash
git add src/lib/customer-auth.ts
git commit -m "fix: prevent customer/owner session secret cross-use by removing fallback"
```

---

## Phase 3: UX Polish

### Task 8: Add swipe-to-dismiss on BottomSheet

**Covers:** Mobile-friendly gesture to close bottom sheet

**Files:**
- Modify: `src/components/ui/bottom-sheet.tsx`

- [ ] **Step 1: Add swipe gesture**

Track touch start Y and touch move Y. When the user drags down more than 100px (or 30% of the sheet height), call `onClose`. Add a CSS transition for the drag movement.

```typescript
const touchStartY = useRef(0);
const [dragOffset, setDragOffset] = useState(0);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartY.current = e.touches[0].clientY;
};

const handleTouchMove = (e: React.TouchEvent) => {
  const delta = e.touches[0].clientY - touchStartY.current;
  if (delta > 0) setDragOffset(delta);
};

const handleTouchEnd = () => {
  if (dragOffset > 100) onClose();
  setDragOffset(0);
};
```

Apply `transform: translateY(${dragOffset}px)` to the sheet content, with a transition when released.

- [ ] **Step 2: Run tests and build**

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/bottom-sheet.tsx
git commit -m "feat: add swipe-to-dismiss gesture on bottom sheet"
```

---

### Task 9: Add empty states to key screens

**Covers:** Show helpful empty states when no data exists

**Files:**
- Modify: `src/components/landing/service-card-grid.tsx`
- Modify: `src/components/owner/timeline.tsx`
- Modify: `src/components/owner/activity-log.tsx`

- [ ] **Step 1: Empty state for service-card-grid**

When `services` is empty or all services are inactive, show a centered message:

```tsx
if (services.length === 0) {
  return (
    <div className="px-4 py-12 text-center">
      <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
      <p className="text-caption text-muted-foreground">هنوز خدماتی اضافه نشده</p>
    </div>
  );
}
```

- [ ] **Step 2: Empty state for timeline**

When `dayBookings` is empty and `dayBlockedTimes` is empty, show:

```tsx
<div className="px-4 py-8 text-center">
  <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
  <p className="text-caption text-muted-foreground">نوبتی برای این روز ثبت نشده</p>
</div>
```

- [ ] **Step 3: Empty state for activity-log**

When filtered logs are empty, show:

```tsx
<div className="px-4 py-8 text-center">
  <p className="text-caption text-muted-foreground">فعالیتی ثبت نشده</p>
</div>
```

- [ ] **Step 4: Run tests and build**

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/service-card-grid.tsx src/components/owner/timeline.tsx src/components/owner/activity-log.tsx
git commit -m "feat: add empty state placeholders for services, timeline, and activity log"
```

---

### Task 10: Auto-scroll timeline to current time

**Covers:** Scroll timeline to "now" indicator on mount

**Files:**
- Modify: `src/components/owner/timeline.tsx`

- [ ] **Step 1: Add scroll-to-now on mount**

Add an `id="now"` to the current time indicator line. Use a `useEffect` to scroll to it on mount:

```typescript
useEffect(() => {
  const nowEl = document.getElementById("timeline-now");
  if (nowEl) {
    nowEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}, [bookings]);
```

- [ ] **Step 2: Run tests and build**

- [ ] **Step 3: Commit**

```bash
git add src/components/owner/timeline.tsx
git commit -m "feat: auto-scroll timeline to current time on mount"
```

---

### Task 11: Add open/close animation to BottomSheet

**Covers:** Smooth entrance/exit animation for bottom sheet

**Files:**
- Modify: `src/components/ui/bottom-sheet.tsx`

- [ ] **Step 1: Add animation states**

Track an `isOpen` state that starts `false` and transitions to `true` after mount. Use CSS transitions for the transform and opacity.

```typescript
const [isVisible, setIsVisible] = useState(false);
useEffect(() => {
  requestAnimationFrame(() => setIsVisible(true));
}, []);

// On close, animate out then call onClose
const handleClose = () => {
  setIsVisible(false);
  setTimeout(onClose, 200);
};
```

Apply `transition: transform 200ms ease-out, opacity 200ms ease-out` and use `translateY(${isVisible ? 0 : 100}%)` and `opacity(${isVisible ? 1 : 0})`.

- [ ] **Step 2: Run tests and build**

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/bottom-sheet.tsx
git commit -m "feat: add smooth open/close animation to bottom sheet"
```

---

### Task 12: Add phone validation before WhatsApp URL construction

**Covers:** Validate phone format before constructing WhatsApp/SMS URLs

**Files:**
- Modify: `src/components/landing/contact-buttons.tsx`
- Modify: `src/components/booking/booking-confirm.tsx`

**Interfaces:**
- Consumes: `isValidIranianPhone` from `@/lib/digits.ts`

- [ ] **Step 1: Guard WhatsApp/SMS links in contact-buttons.tsx**

```typescript
import { isValidIranianPhone } from "@/lib/digits";

const whatsappUrl = isValidIranianPhone(phone)
  ? `https://wa.me/98${phone.slice(1)}`
  : null;
const smsUrl = isValidIranianPhone(phone) ? `sms:${phone}` : null;
```

Only render the WhatsApp/SMS buttons when the URL is valid.

- [ ] **Step 2: Same fix in booking-confirm.tsx**

- [ ] **Step 3: Run tests and build**

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/contact-buttons.tsx src/components/booking/booking-confirm.tsx
git commit -m "fix: validate phone format before constructing WhatsApp and SMS URLs"
```

---

## Summary

| Phase | Tasks | Impact |
|-------|-------|--------|
| **Code Cleanup** | 3 | Shared hooks, deduplicated constants, fixed semantic bug |
| **Bug Fixes** | 4 | CSS fix, performance fix, error handling, security fix |
| **UX Polish** | 5 | Swipe-to-dismiss, empty states, scroll-to-now, animations, validation |

**Total: 12 tasks across 3 phases.**
