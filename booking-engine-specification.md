# Forehand Nail Studio
# Booking Engine Specification v7

**Version:** 7.0
**Timezone:** Asia/Tehran
**Calendar:** Jalali (Persian)
**Platform:** Mobile-first Web App

---

## 1. System Overview

This booking engine is designed to:

- Minimize dead time (empty gaps between bookings)
- Provide intelligent time suggestions via 3-level gap minimization
- Preserve full artist override control
- Maintain a clean, minimal, and confusion-free UX
- Operate strictly in Asia/Tehran timezone
- Support Jalali calendar transitions

All availability logic is **service-aware**, **buffer-aware**, and **shift-aware**.

---

## 2. Owner-Configurable Variables

| # | Variable | Symbol | Default | Description |
|---|----------|--------|---------|-------------|
| 1 | Shift Start | A | Required | Daily working start time |
| 2 | Shift End | B | Required | Daily working end time |
| 3 | Resolution | R | 15 min | Slot interval (also display interval) |
| 4 | Proximity Window | P | ±2h | Allowed range around existing bookings |
| 5 | Buffer | — | 0 min | Mandatory gap after each booking |
| 6 | Early Extra Hours | E_early | 0 | Hours before A for expansion |
| 7 | Late Extra Hours | E_late | 0 | Hours after B for expansion |
| 8 | Fill Threshold | T | 80% | Shift fill % that triggers expansion |
| 9 | Overflow | — | OFF | Allow booking to extend past B |
| 10 | Overflow Minutes | — | 0 | How many minutes past B is allowed |

All variables are owner-configurable from the schedule settings page.

---

## 3. Duration Calculation

```
rawDuration = service.duration + sum(selected addons durations)
effectiveDuration = ceil(rawDuration / R) * R

If buffer > 0:
  effectiveDuration = ceil((rawDuration + buffer) / R) * R
```

Examples:
- Service 30min, addon 10min, buffer 0, R=15 → `ceil(40/15)*15 = 45min`
- Service 30min, addon 10min, buffer 15, R=15 → `ceil(55/15)*15 = 60min`
- Service 47min, buffer 15, R=15 → `ceil(62/15)*15 = 75min`

---

## 4. Slot Validity

A slot at time `t` is valid if ALL of:

1. `t` is on the R grid (t % R === 0)
2. `slotStart < B` (starts before shift end)
3. `slotStart + effectiveDuration ≤ B + overflow_minutes` (if overflow enabled)
4. `slotStart + effectiveDuration ≤ B` (if overflow disabled)
5. No overlap with existing confirmed bookings
6. No overlap with blocked times
7. `slotStart ≥ currentTehranTime` (today only — past slots filtered)

**Last slot rule:** The last slot starts at `B - R`, not at `B - effectiveDuration`. The service can extend past B as long as it doesn't go past the overflow limit.

---

## 5. Gap Minimization (3-Level Model)

### Level 1 — First Booking (0 bookings on day)

All valid slots from A to B are available. No proximity restriction.

### Level 2 — Second Booking (1 booking on day)

Only slots within **±P** of the existing booking are shown.

If no slots found in ±P:
- Try ±(P × 2) (e.g., ±4h if P=2h)
- If still none → suggest nearest next available day

### Level 3 — Third+ Bookings (2+ bookings on day)

Priority order:
1. **Fill internal dead gaps** — slots that fit between existing bookings
2. **Attach to earliest booking edge** — slot immediately before the earliest booking
3. **Attach to latest booking edge** — slot immediately after the latest booking
4. **If none valid** → suggest next available day

This logic continues for all bookings (#4, #5, etc.) — same algorithm, no special cases.

---

## 6. Suggested vs Other Slots

After generating all valid slots, classify:

- **Suggested** (labeled "ساعت پیشنهادی"): Slots that fill gaps or are adjacent to existing bookings
- **Other** (labeled "ساعت موجود"): All other valid slots that pass rules but aren't optimal for density

---

## 7. Dynamic Shift Expansion

### Trigger

```
bookedMinutes = sum of overlap(existingBookings, shift A→B)
shiftMinutes = B - A
fillPercentage = (bookedMinutes / shiftMinutes) × 100

if fillPercentage ≥ T:
  expand shift
```

### Expanded Window

```
expandedStart = A - E_early (min 0)
expandedEnd = B + E_late
```

### Visibility

Expanded slots are **always visible** regardless of threshold. Visual state changes:
- **Before trigger:** expanded slots show as "not available" (grayed)
- **After trigger:** expanded slots become "available" (bookable)

---

## 8. Day Visibility Rules

- All 7 days **always visible** in calendar, even if no slots
- Day state reflects **selected service duration** (a day may have slots for 30min service but not 90min)

Day states:

| State | Visual Treatment |
|-------|-----------------|
| Today | Primary border highlight |
| Selected | Primary background |
| Today + Selected | Combined style |
| Fully Booked | Tagged "تکمیل" + hatched pattern |
| No availability for service | Different from fully booked |

---

## 9. Today Behavior

- Past slots filtered (server time via `getTehranNow()`)
- If no slots remain today → show "ساعتی موجود نیست" + "روز بعد" button
- Today always visible regardless of availability

---

## 10. Artist Override Rules

Artist is the **source of truth**.

The artist can:
- Add manual bookings (with or without customer data)
- Add bookings outside working hours
- Cancel bookings
- Add time blocks
- Modify shift hours

Engine must instantly recalculate availability after any change.

---

## 11. Concurrent Booking Protection

If two users attempt to book the same slot:

- Final validation must occur server-side at `/api/book/reserve`
- UI availability does not guarantee final booking
- Slot must be revalidated before confirmation
- Returns 409 Conflict if slot is taken

---

## 12. Special Calendar Cases

### Jalali Month Transition
Date strip must properly handle month transitions.

### Friday (Weekend)
Friday is weekend but NOT automatically closed. Closed status must be explicitly configured.

---

## 13. Service-Aware Availability

Day availability must be calculated per selected service. A day may have availability for a 30-minute service but not for a 90-minute service. Day state must reflect selected service duration.

---

## 14. System Guarantees

- No invisible dead gaps
- No partial past slots
- No shift overflow bookings (unless enabled)
- Artist full override power
- Density-optimized scheduling
- Transparent UX messaging
- Race-condition protection
- Service-aware availability
- Buffer-aware gap calculation
- Configurable resolution (5/10/15/20/30/60 min)

---

## Architecture Philosophy

> A density-optimized, artist-controlled, service-aware booking intelligence layer
> designed specifically for a single-artist nail studio.
