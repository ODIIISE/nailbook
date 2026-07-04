# NailBook Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the NailBook booking app to achieve a 3-tap booking flow, simplify the owner dashboard, fix performance issues, and apply a consistent design system.

**Architecture:** Keep existing Supabase data and database schema. Rebuild UI components with clean, focused architecture. Implement true 3-tap booking flow. Simplify owner dashboard to just schedule view.

**Tech Stack:** Next.js 16, React 19, Supabase, Tailwind CSS v4, shadcn/ui, Vazirmatn font, Jalali calendar

## Global Constraints

- All time logic uses Asia/Tehran timezone
- All dates use Jalali (Persian) calendar
- RTL layout for Persian text
- Mobile-first: all touch targets 48px minimum
- Preserve existing Supabase database schema and data
- Keep existing API routes working

---

## Phase 1: Foundation (Fix Critical Issues)

### Task 1: Fix Performance - Optimize SalonProvider

**Covers:** [S4]

**Files:**
- Modify: `src/lib/salon-context.tsx`

**Interfaces:**
- Consumes: Existing Supabase data functions
- Produces: Optimized SalonProvider with proper memoization

- [ ] **Step 1: Add React.memo and useMemo optimizations**

```typescript
// Add to top of salon-context.tsx
import { useMemo } from "react";

// Inside SalonProvider, wrap computed values with useMemo:
const memoizedServices = useMemo(() => services, [services]);
const memoizedBookings = useMemo(() => bookings, [bookings]);
const memoizedHighlights = useMemo(() => highlights, [highlights]);
```

- [ ] **Step 2: Optimize callback functions with useCallback**

```typescript
// Wrap all handlers with useCallback and proper dependencies
const handleAddBooking = useCallback(async (booking: Booking) => {
  setBookings((prev) => [...prev, booking]);
  await insertBooking(booking);
}, []); // Empty deps since insertBooking is stable
```

- [ ] **Step 3: Add loading state with skeleton**

```typescript
// Replace the mock data return with proper loading skeleton
if (!loaded) {
  return (
    <SalonContext.Provider value={/* ... mock values ... */}>
      {children}
    </SalonContext.Provider>
  );
}
```

- [ ] **Step 4: Run dev server and verify no errors**

Run: `npm run dev`
Expected: App loads without console errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/salon-context.tsx
git commit -m "fix: optimize SalonProvider with React.memo and useMemo"
```

---

### Task 2: Fix Performance - Optimize BookContent Component

**Covers:** [S4]

**Files:**
- Modify: `src/app/book/content.tsx`

**Interfaces:**
- Consumes: Existing booking flow logic
- Produces: Optimized BookContent with reduced re-renders

- [ ] **Step 1: Add useMemo for expensive calculations**

```typescript
// Already has useMemo for timeSlots, totalPrice, totalDuration
// Verify they have correct dependencies:
const timeSlots = useMemo(() => {
  if (!selectedDate || !selectedService) return [];
  // ... existing logic
}, [selectedDate, selectedService, totalDuration, workingHours, salon, bookings, blockedTimes]);
```

- [ ] **Step 2: Add useCallback for event handlers**

```typescript
// Wrap handlers with useCallback
const handleSelectDate = useCallback((date: Date) => {
  setSelectedDate(date);
  setSelectedTime(null);
}, []);

const handleSelectTime = useCallback((time: string) => {
  setSelectedTime((prev) => (prev === time ? null : time));
}, []);
```

- [ ] **Step 3: Add loading states for auth steps**

```typescript
// Add skeleton loaders for auth steps
{authStep === "phone" && (
  <div className="space-y-4">
    {isLoading ? (
      <div className="space-y-3">
        <div className="skeleton h-10 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    ) : (
      // ... existing form
    )}
  </div>
)}
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Expected: Booking flow works without lag

- [ ] **Step 5: Commit**

```bash
git add src/app/book/content.tsx
git commit -m "fix: optimize BookContent with useMemo and useCallback"
```

---

### Task 3: Fix Data Flow - Add Error Boundaries

**Covers:** [S4]

**Files:**
- Create: `src/components/ui/error-boundary.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: React error boundary pattern
- Produces: Global error handling

- [ ] **Step 1: Create ErrorBoundary component**

```typescript
// src/components/ui/error-boundary.tsx
"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <h2 className="text-h2 text-foreground">خطایی رخ داد</h2>
            <p className="text-body text-muted-foreground">
              لطفاً دوباره تلاش کنید
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 2: Wrap app with ErrorBoundary**

```typescript
// src/app/layout.tsx
import { ErrorBoundary } from "@/components/ui/error-boundary";

// In the return statement, wrap children:
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: App loads, errors show friendly message

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/error-boundary.tsx src/app/layout.tsx
git commit -m "feat: add global error boundary"
```

---

### Task 4: Fix Mobile Optimization - Touch Targets

**Covers:** [S4, S5]

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/button.tsx`

**Interfaces:**
- Consumes: Existing CSS variables
- Produces: Mobile-optimized touch targets

- [ ] **Step 1: Add touch target utilities to CSS**

```css
/* Add to globals.css */
@layer utilities {
  .touch-target {
    min-height: 48px;
    min-width: 48px;
  }
  .touch-target-sm {
    min-height: 44px;
    min-width: 44px;
  }
}
```

- [ ] **Step 2: Update Button component with min-height**

```typescript
// src/components/ui/button.tsx
// Update variants to include min-height:
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 min-h-[48px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-4 py-2",
        sm: "h-11 rounded-md px-3",
        lg: "h-13 rounded-md px-8",
        icon: "h-12 w-12",
        "icon-sm": "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: All buttons have 48px minimum height

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/ui/button.tsx
git commit -m "fix: ensure 48px minimum touch targets for mobile"
```

---

## Phase 2: Customer Flow (3-Tap Booking)

### Task 5: Redesign Service Cards for Landing Page

**Covers:** [S2]

**Files:**
- Create: `src/components/landing/service-card-grid.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `services` from SalonContext
- Produces: Service cards displayed on landing page

- [ ] **Step 1: Create ServiceCardGrid component**

```typescript
// src/components/landing/service-card-grid.tsx
"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Clock, DollarSign } from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import type { Service } from "@/lib/mock-data";

interface ServiceCardGridProps {
  services: Service[];
}

export function ServiceCardGrid({ services }: ServiceCardGridProps) {
  const router = useRouter();
  const activeServices = services
    .filter((s) => s.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="px-4 py-6">
      <h2 className="text-h2 text-foreground mb-4">خدمات ما</h2>
      <div className="space-y-3">
        {activeServices.map((service) => (
          <Card
            key={service.id}
            className="p-4 cursor-pointer hover:shadow-elevated transition-shadow"
            onClick={() => router.push(`/book?service=${service.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-body-lg font-bold text-foreground">
                  {service.name}
                </h3>
                <p className="text-caption text-muted-foreground mt-1">
                  {service.description}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-small text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{toPersianDigits(service.duration_minutes)} دقیقه</span>
                  </div>
                  <div className="flex items-center gap-1 text-small font-bold text-primary">
                    <DollarSign className="h-3.5 w-3.5" />
                    <span>{toPersianDigits(service.price.toLocaleString("fa-IR"))} تومان</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update landing page to show services**

```typescript
// src/app/page.tsx
import { ServiceCardGrid } from "@/components/landing/service-card-grid";

// Inside the return statement, after <Highlights> and before <Hero>:
<ServiceCardGrid services={services} />
```

- [ ] **Step 3: Remove separate services page**

```bash
# Remove the services page since it's now on landing
rm -rf src/app/services
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Expected: Services show on landing page, tapping navigates to book

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/service-card-grid.tsx src/app/page.tsx
git rm -r src/app/services
git commit -m "feat: add service cards to landing page, remove separate services page"
```

---

### Task 6: Simplify Auth Flow (Phone + PIN Only)

**Covers:** [S2]

**Files:**
- Modify: `src/app/book/content.tsx`

**Interfaces:**
- Consumes: Existing auth context
- Produces: Simplified 2-step auth (phone → PIN)

- [ ] **Step 1: Remove name step from auth flow**

```typescript
// In content.tsx, update authStep type:
type AuthStep = "phone" | "pin" | "confirm-pin" | "verify-pin";

// Remove the name step handling:
const handleAuthPhoneSubmit = async () => {
  if (authPhone.length < 10) {
    setAuthError("شماره موبایل معتبر نیست");
    return;
  }
  setIsLoading(true);
  setAuthError("");
  const result = await checkPhone(authPhone);
  setIsLoading(false);

  if (result.locked) {
    setAuthError(result.message || "حساب قفل شده است");
    return;
  }

  if (result.exists && result.hasPin) {
    setAuthStep("verify-pin");
  } else if (result.exists) {
    setAuthStep("pin");
  } else {
    // New user - go directly to PIN creation (name will be optional)
    setAuthStep("pin");
  }
};
```

- [ ] **Step 2: Update auth UI to skip name**

```typescript
// Remove the name step JSX block entirely
// Update the PIN creation step to not require name:
{authStep === "pin" && (
  <div className="space-y-4">
    <div className="text-center mb-4">
      <h2 className="text-h1 text-foreground">ساخت رمز</h2>
      <p className="text-[13px] text-muted-foreground mt-1">
        یک کد ۴ رقمی برای ورودهای بعدی بسازید
      </p>
    </div>
    <PinInput onComplete={handleAuthPinSubmit} disabled={isLoading} />
    {authError && (
      <p className="text-[13px] text-destructive text-center mt-2">{authError}</p>
    )}
  </div>
)}
```

- [ ] **Step 3: Update createPin to not require name**

```typescript
// In handleAuthConfirmPinSubmit, pass empty name if not provided:
const handleAuthConfirmPinSubmit = async (confirmPin: string) => {
  if (authPin !== confirmPin) {
    setAuthError("رمزها مطابقت ندارند");
    return;
  }
  setIsLoading(true);
  setAuthError("");
  // Pass empty name - user can update later in profile
  const result = await createPin(authPhone, authPin, "");
  setIsLoading(false);

  if (result.success) {
    setStep("confirm");
  } else {
    setAuthError(result.error || "خطا در ثبت‌نام");
  }
};
```

- [ ] **Step 4: Run dev server and verify**

Run: `npm run dev`
Expected: Auth flow is phone → PIN (no name step)

- [ ] **Step 5: Commit**

```bash
git add src/app/book/content.tsx
git commit -m "feat: simplify auth flow to phone + PIN only"
```

---

### Task 7: Integrate Date Selection with Time Slots

**Covers:** [S2]

**Files:**
- Modify: `src/components/booking/jalali-calendar.tsx`
- Modify: `src/components/booking/time-slots.tsx`

**Interfaces:**
- Consumes: Existing calendar and time slot components
- Produces: Integrated date+time selection

- [ ] **Step 1: Update JalaliCalendar to be more compact**

```typescript
// src/components/booking/jalali-calendar.tsx
// Make the calendar strip more compact (7 days horizontal)
// Ensure it shows day name and date only (no month)

interface JalaliCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  showPast?: boolean;
}
```

- [ ] **Step 2: Update TimeSlots to show grouped slots**

```typescript
// src/components/booking/time-slots.tsx
// Ensure slots are grouped:
// 1. "ساعت‌های پیشنهادی" (suggested times) - highlighted
// 2. "ساعت‌های دیگر" (other times) - normal

// Add visual distinction between suggested and other slots
const suggestedSlots = slots.filter(s => s.suggested && s.available);
const otherSlots = slots.filter(s => !s.suggested && s.available);
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: Calendar and time slots work together smoothly

- [ ] **Step 4: Commit**

```bash
git add src/components/booking/jalali-calendar.tsx src/components/booking/time-slots.tsx
git commit -m "feat: integrate date selection with grouped time slots"
```

---

## Phase 3: Owner Dashboard (Simple Schedule View)

### Task 8: Create Timeline Component

**Covers:** [S3]

**Files:**
- Create: `src/components/owner/timeline.tsx`

**Interfaces:**
- Consumes: Bookings and blocked times for a day
- Produces: Visual timeline view

- [ ] **Step 1: Create Timeline component**

```typescript
// src/components/owner/timeline.tsx
"use client";

import { useMemo } from "react";
import type { Booking, Service } from "@/lib/mock-data";

interface TimelineProps {
  bookings: Array<Booking & { service?: Service }>;
  blockedTimes: Array<{ start_time: string; end_time: string }>;
  startHour?: number;
  endHour?: number;
}

export function Timeline({
  bookings,
  blockedTimes,
  startHour = 9,
  endHour = 21,
}: TimelineProps) {
  const hours = useMemo(() => {
    const result = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  const getBookingPosition = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = (startH - startHour) * 60 + startM;
    const endMinutes = (endH - startHour) * 60 + endM;
    const totalMinutes = (endHour - startHour) * 60;
    return {
      top: `${(startMinutes / totalMinutes) * 100}%`,
      height: `${((endMinutes - startMinutes) / totalMinutes) * 100}%`,
    };
  };

  return (
    <div className="relative" style={{ height: `${hours.length * 60}px` }}>
      {/* Hour markers */}
      {hours.map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border/30"
          style={{ top: `${((hour - startHour) / (endHour - startHour)) * 100}%` }}
        >
          <span className="absolute -top-3 -right-8 text-xs text-muted-foreground">
            {hour}:00
          </span>
        </div>
      ))}

      {/* Blocked times */}
      {blockedTimes.map((block, i) => {
        const pos = getBookingPosition(block.start_time, block.end_time);
        return (
          <div
            key={`block-${i}`}
            className="absolute left-12 right-4 bg-muted/50 rounded-lg border border-border/50"
            style={{ top: pos.top, height: pos.height }}
          >
            <div className="p-2 text-xs text-muted-foreground">مسدود</div>
          </div>
        );
      })}

      {/* Bookings */}
      {bookings.map((booking) => {
        const pos = getBookingPosition(booking.start_time, booking.end_time);
        return (
          <div
            key={booking.id}
            className="absolute left-12 right-4 bg-primary/10 rounded-lg border border-primary/30"
            style={{ top: pos.top, height: pos.height }}
          >
            <div className="p-2">
              <div className="text-sm font-bold text-foreground">
                {booking.customer_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {booking.service?.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`
Expected: Timeline component renders correctly

- [ ] **Step 3: Commit**

```bash
git add src/components/owner/timeline.tsx
git commit -m "feat: create Timeline component for owner dashboard"
```

---

### Task 9: Redesign Owner Dashboard

**Covers:** [S3]

**Files:**
- Modify: `src/app/owner/page.tsx`

**Interfaces:**
- Consumes: Timeline component, existing modals
- Produces: Simplified owner dashboard

- [ ] **Step 1: Update OwnerDashboard with Timeline**

```typescript
// src/app/owner/page.tsx
import { Timeline } from "@/components/owner/timeline";

// Replace AgendaTimeline with Timeline:
<Timeline
  bookings={dayBookings}
  blockedTimes={dayBlockedTimes}
/>
```

- [ ] **Step 2: Simplify top section to today's summary**

```typescript
// Keep the earnings summary card
// Remove complex layout, keep it simple:
<div className="px-4 py-4 space-y-4">
  <JalaliCalendar
    selectedDate={currentDate}
    onSelectDate={setCurrentDate}
    showPast
  />

  <div className="flex gap-2">
    <Button
      variant="outline"
      className="flex-1"
      onClick={() => setShowBlockTime(true)}
    >
      <Plus className="h-4 w-4 ml-1" />
      مسدود کردن زمان
    </Button>
    <Button
      variant="outline"
      className="flex-1"
      onClick={() => setShowManualReserve(true)}
    >
      <Plus className="h-4 w-4 ml-1" />
      رزرو دستی
    </Button>
  </div>

  <Card className="p-4">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[13px] font-bold text-foreground">حساب امروز</span>
      <Button variant="ghost" size="icon-sm" onClick={() => setShowEarnings(true)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <p className="text-[13px] text-muted-foreground">پرداخت شده</p>
        <p className="text-[15px] font-bold text-success">
          {toPersianDigits(accounting.paid.toLocaleString("fa-IR"))}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[13px] text-muted-foreground">پرداخت نشده</p>
        <p className="text-[15px] font-bold text-destructive">
          {toPersianDigits(accounting.unpaid.toLocaleString("fa-IR"))}
        </p>
      </div>
      <div className="text-center">
        <p className="text-[13px] text-muted-foreground">کل</p>
        <p className="text-[15px] font-bold text-foreground">
          {toPersianDigits(accounting.total.toLocaleString("fa-IR"))}
        </p>
      </div>
    </div>
  </Card>

  <Timeline
    bookings={dayBookings}
    blockedTimes={dayBlockedTimes}
  />
</div>
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: Owner dashboard shows timeline view

- [ ] **Step 4: Commit**

```bash
git add src/app/owner/page.tsx
git commit -m "feat: redesign owner dashboard with Timeline component"
```

---

## Phase 4: Polish (Design System & Mobile)

### Task 10: Update Design System Colors

**Covers:** [S5]

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Existing CSS variables
- Produces: Updated color palette

- [ ] **Step 1: Update color variables**

```css
/* Update :root variables in globals.css */
:root {
  --background: #FAFAFA;
  --foreground: #1A1A1A;
  --card: rgba(255, 255, 255, 0.85);
  --card-foreground: #1A1A1A;
  --popover: rgba(255, 255, 255, 0.95);
  --popover-foreground: #1A1A1A;
  --primary: #E8B4B8;
  --primary-foreground: #1A1A1A;
  --secondary: #F4F4F6;
  --secondary-foreground: #1A1A1A;
  --muted: #F4F4F6;
  --muted-foreground: #6E6E73;
  --accent: #C97B7B;
  --accent-foreground: #FFFFFF;
  --destructive: #FF3B30;
  --success: #34C759;
  --border: rgba(0, 0, 0, 0.08);
  --input: rgba(0, 0, 0, 0.06);
  --ring: #E8B4B8;
  --rose: #E8B4B8;
  --gold: #D4A853;
  --warm-white: #FAFAFA;
  --navy: #1A1A1A;
  /* ... rest of variables */
}
```

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`
Expected: Colors update throughout the app

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: update design system color palette"
```

---

### Task 11: Add Subtle Animations

**Covers:** [S5]

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Existing animation utilities
- Produces: Subtle, professional animations

- [ ] **Step 1: Update animation utilities**

```css
/* Update existing animations in globals.css */
@layer utilities {
  .animate-fade {
    animation: fade 200ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .animate-scale {
    animation: scaleIn 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .animate-slideUp {
    animation: slideUp 200ms cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  /* Add new subtle animation */
  .animate-pulse-subtle {
    animation: pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
}

@keyframes pulseSubtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`
Expected: Animations are subtle and professional

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add subtle, professional animations"
```

---

### Task 12: Mobile Optimization - Bottom Sheets

**Covers:** [S4, S5]

**Files:**
- Create: `src/components/ui/bottom-sheet.tsx`
- Modify: `src/components/owner/block-time-modal.tsx`
- Modify: `src/components/owner/manual-reserve-modal.tsx`

**Interfaces:**
- Consumes: Existing modal components
- Produces: Mobile-friendly bottom sheets

- [ ] **Step 1: Create BottomSheet component**

```typescript
// src/components/ui/bottom-sheet.tsx
"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 animate-fade"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg bg-white rounded-t-2xl p-4 animate-slideUp"
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-h3 text-foreground">{title}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update modals to use BottomSheet**

```typescript
// In block-time-modal.tsx and manual-reserve-modal.tsx
import { BottomSheet } from "@/components/ui/bottom-sheet";

// Replace Dialog with BottomSheet:
<BottomSheet open={open} onClose={onCancel} title="مسدود کردن زمان">
  {/* modal content */}
</BottomSheet>
```

- [ ] **Step 3: Run dev server and verify**

Run: `npm run dev`
Expected: Modals open as bottom sheets on mobile

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/bottom-sheet.tsx src/components/owner/block-time-modal.tsx src/components/owner/manual-reserve-modal.tsx
git commit -m "feat: add BottomSheet component for mobile modals"
```

---

### Task 13: Final Testing and Verification

**Covers:** [S1, S2, S3, S4, S5]

**Files:**
- None (testing only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified working app

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds without errors

- [ ] **Step 2: Test customer flow**

1. Open app on mobile
2. Tap a service card
3. Select date and time
4. Enter phone and PIN
5. Confirm booking
6. Verify receipt shows

- [ ] **Step 3: Test owner flow**

1. Login as owner
2. View today's schedule
3. Block a time slot
4. Add a manual booking
5. Verify timeline updates

- [ ] **Step 4: Test performance**

1. Open Chrome DevTools
2. Check Performance tab
3. Verify no layout shifts
4. Verify smooth animations

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete NailBook refactor - 3-tap booking, simplified owner dashboard"
```

---

## Success Criteria

- [ ] Customer can book in 3 taps (service → time → confirm)
- [ ] Owner dashboard shows simple timeline view
- [ ] All touch targets are 48px minimum
- [ ] App loads in <2 seconds
- [ ] No console errors
- [ ] Works on mobile devices
- [ ] Persian text displays correctly (RTL)
- [ ] Jalali calendar works properly
