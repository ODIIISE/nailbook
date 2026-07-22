---
name: booking-app
description: Use when building, reviewing, or improving booking/appointment/scheduling features. Covers slot engines, conflict resolution, booking flows, owner dashboards, calendar UI, working hours, timezone handling, and booking UX patterns. Also use for salon/clinic/service booking apps, appointment scheduling, time-slot selection, and reservation systems. Trigger on: "booking", "appointment", "schedule", "slot", "calendar", "reservation", "booking flow", "booking UX", "owner dashboard", "working hours", "blocked times".
version: 1.0.0
license: MIT
---

# Booking App Patterns & UX Guide

A comprehensive guide for building production-quality booking/scheduling features, derived from studying cal.com, NailBook, and other booking systems.

## Core Patterns

### 1. Slot Engine Architecture

The slot engine generates available time slots from working hours + existing bookings + blocked times.

**Data sources:**
- Working hours (weekly schedule with open/close times)
- Existing bookings (reserved + confirmed status)
- Blocked times (owner-managed)
- Service duration + addons + buffer
- Resolution (slot_interval_minutes)

**Algorithm:**
```
1. Get working hours for the requested date
2. Generate raw slots from open to close (by resolution)
3. Remove slots that overlap with existing bookings
4. Remove slots that overlap with blocked times
5. Remove slots too close to closing time (consider overflow)
6. Group into categories: available, booked, unavailable
```

**Key decisions:**
- Generate slots server-side (prevents client manipulation)
- Cache slot generation for same-day requests
- Return slot metadata (available count, next available slot)

### 2. Booking Conflict Resolution

**Atomic booking (prevents double-booking):**
```sql
INSERT INTO bookings (...) VALUES (...)
ON CONFLICT (date_gregorian, start_time, end_time)
WHERE status IN ('reserved', 'confirmed')
DO NOTHING
RETURNING id
```

If INSERT returns no rows → conflict detected → return 409 to client.

**Optimistic locking:**
- Client sends slot times
- Server validates slot is still available within transaction
- Atomic INSERT with ON CONFLICT handles race conditions
- Block times checked AFTER insert (within same transaction)

**Transaction flow:**
```
BEGIN
  1. Validate service exists
  2. Validate addons exist
  3. Validate working hours
  4. Atomic INSERT with ON CONFLICT
  5. Check blocked times (rollback if blocked)
  6. Check duration matches expected
COMMIT
```

### 3. Working Hours Configuration

**Data model:**
```typescript
interface WorkingHours {
  sat: { open: string; close: string } | null;  // null = day off
  sun: { open: string; close: string } | null;
  mon: { open: string; close: string } | null;
  tue: { open: string; close: string } | null;
  wed: { open: string; close: string } | null;
  thu: { open: string; close: string } | null;
  fri: { open: string; close: string } | null;
}
```

**Features:**
- Per-day open/close times
- Null = day off
- Specific date overrides (holidays, special hours)
- Overflow allowance (extend past closing)
- Buffer between appointments
- Resolution (slot interval: 15min, 30min, etc.)

### 4. Timezone Handling

**Rule: Always resolve in business timezone (Asia/Tehran for Iran)**

- Store all times in business timezone (never UTC for display)
- Convert client timezone → business timezone for slot queries
- Use `Intl.DateTimeFormat` with explicit timezone
- Cache timezone formatter (immutable, expensive to construct)
- Jalali calendar for date display in Iran

### 5. Booking Flow UX Patterns

**4-state flow (from cal.com patterns):**
1. **Logged-in user** → skip auth → select service → pick time → confirm
2. **Existing user, not logged in** → check phone → verify PIN → confirm
3. **Existing user without PIN** → check phone → create PIN → confirm
4. **New user** → check phone → create PIN → confirm

**Progress indicators:**
- Show step progress (1/4, 2/4, etc.)
- Persistent service summary card during time selection
- Back button on every step (except confirmation)
- Loading states between steps

**Slot selection UX:**
- Calendar first (date selection)
- Then time slots (grouped by availability)
- Collapse "unavailable" and "booked" sections by default
- Show slot duration and end time
- Highlight selected slot
- Sticky CTA button

### 6. Owner Dashboard Patterns

**Timeline view:**
- Hourly grid (8:00-22:00 typically)
- Color-coded by status (reserved, confirmed, completed, cancelled)
- Click to open booking details modal
- Quick actions: mark paid, change status, cancel

**Day view:**
- Calendar date picker (horizontal scroll)
- Day bookings list
- Blocked times visualization
- Earnings summary

**Missing features to add:**
- Weekly/monthly overview
- Cross-date search
- Batch operations
- Notification system
- Booking count per user

### 7. API Design Patterns

**REST endpoints for bookings:**
```
GET  /api/book/available-slots?date=&service_id=  → slot availability
POST /api/book                                    → create booking
GET  /api/bookings/[id]                           → booking details
PATCH /api/bookings/[id]                          → cancel/update status
POST /api/owner/bookings/paid                     → toggle payment
POST /api/owner/bookings/status                   → change status
```

**Response patterns:**
- Always return consistent error format: `{ error: "message" }`
- Use HTTP status codes correctly (400, 401, 403, 404, 409, 429, 500)
- Return conflict details for double-booking attempts
- Include booking metadata in responses

### 8. Anti-Spam & Rate Limiting

**Per-phone limits:**
- Max 3 bookings per day per phone
- 5-minute cooldown between bookings
- Exponential lockout for failed PIN attempts

**IP-based limits:**
- 20 attempts per 15 minutes for auth endpoints
- Track with in-memory Map (per-process)

## UX Improvements Checklist

### HIGH Priority
- [ ] Step progress indicator in booking flow
- [ ] Skip empty addons step
- [ ] Forgot PIN recovery flow
- [ ] Service images on landing page
- [ ] Customer reviews/testimonials
- [ ] Total price (including addons) in bookings list
- [ ] Change PIN from profile
- [ ] Booking notification system
- [ ] Weekly/monthly overview for owner
- [ ] Booking count/spending per user
- [ ] Waitlist for fully booked days
- [ ] Customer reviews/ratings

### MEDIUM Priority
- [ ] Service summary during datetime step
- [ ] Collapse unavailable slots by default
- [ ] Pull-to-refresh on mobile
- [ ] Filter bookings by status
- [ ] Quick rebook option
- [ ] Map/directions integration
- [ ] Offline detection
- [ ] Consistent modal patterns (all bottom sheets on mobile)
- [ ] Calendar scroll indicator
- [ ] PWA service worker

### LOW Priority
- [ ] Haptic feedback on key actions
- [ ] Swipe gestures for highlight navigation
- [ ] Phone number formatting preview
- [ ] Dark mode

## Code Patterns

### Slot Generation (Server-side)
```typescript
async function generateSlots(
  date: string,
  serviceId: string,
  workingHours: WorkingHours,
  bookings: Booking[],
  blockedTimes: BlockedTime[],
  salon: SalonInfo
): Promise<TimeSlot[]> {
  const dayHours = workingHours[getDayOfWeek(date)];
  if (!dayHours) return [];

  const service = services.find(s => s.id === serviceId);
  const duration = service.duration_minutes + salon.slot_buffer_minutes;
  const resolution = salon.slot_interval_minutes;

  const slots: TimeSlot[] = [];
  const [openH, openM] = dayHours.open.split(':').map(Number);
  const [closeH, closeM] = dayHours.close.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let m = openMinutes; m + duration <= closeMinutes; m += resolution) {
    const start = `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    const end = `${String(Math.floor((m+duration)/60)).padStart(2,'0')}:${String((m+duration)%60).padStart(2,'0')}`;

    const isBooked = bookings.some(b =>
      b.status !== 'cancelled' &&
      b.start_time < end && b.end_time > start
    );
    const isBlocked = blockedTimes.some(bt =>
      bt.start_time < end && bt.end_time > start
    );

    slots.push({ start, end, available: !isBooked && !isBlocked });
  }
  return slots;
}
```

### Atomic Booking (Transaction)
```typescript
async function createBooking(booking: BookingInput) {
  const client = await sql.connect();
  try {
    await client.query('BEGIN');

    // 1. Validate service
    const { rows: svc } = await client.query(
      'SELECT duration_minutes FROM services WHERE id = $1', [booking.service_id]
    );
    if (svc.length === 0) throw new Error('Service not found');

    // 2. Validate working hours
    // ... check dayHours, open/close times

    // 3. Atomic INSERT with ON CONFLICT
    const { rows } = await client.query(
      `INSERT INTO bookings (...)
       VALUES (...)
       ON CONFLICT (date_gregorian, start_time, end_time)
       WHERE status IN ('reserved', 'confirmed')
       DO NOTHING
       RETURNING id`,
      [...]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'Slot already booked', status: 409 };
    }

    // 4. Check blocked times
    const { rows: blocked } = await client.query(
      'SELECT id FROM blocked_times WHERE ...', [...]
    );
    if (blocked.length > 0) {
      await client.query('ROLLBACK');
      return { error: 'Time is blocked', status: 409 };
    }

    await client.query('COMMIT');
    return { success: true, booking_id: rows[0].id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Progress Indicator Component
```tsx
function BookingProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex-1">
          <div
            className={`h-1.5 rounded-full transition-colors ${
              i < currentStep ? 'bg-primary' :
              i === currentStep ? 'bg-primary/50' : 'bg-muted'
            }`}
          />
        </div>
      ))}
      <span className="text-xs text-muted-foreground">
        {currentStep}/{totalSteps}
      </span>
    </div>
  );
}
```

### Collapsible Slot Sections
```tsx
function SlotSection({ title, slots, defaultExpanded = false }: SlotSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const availableCount = slots.filter(s => s.available).length;

  return (
    <div className="space-y-2">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">
          {availableCount} available
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {expanded && (
        <div className="grid grid-cols-3 gap-2">
          {slots.map(slot => (
            <SlotButton key={slot.start} slot={slot} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Architecture Decisions

### Why server-side slot generation?
- Prevents client manipulation of available times
- Single source of truth for availability
- Easier to maintain business rules
- Cache-friendly for repeated queries

### Why atomic booking with ON CONFLICT?
- Eliminates TOCTOU race conditions
- No need for distributed locks
- Database handles conflict detection
- Simple rollback on conflict

### Why store times in business timezone?
- Display always matches salon's local time
- No DST ambiguity for Iran (fixed UTC+3:30)
- Simpler mental model for salon owner
- Client-side conversion for display only

### Why PIN-based auth (not password)?
- Mobile-first: 4-digit PIN is faster than password
- No email required (phone-only)
- Simpler flow for salon customers
- Owner can see customer PINs (plain text)
- Owner PINs are PBKDF2 hashed (secure)
