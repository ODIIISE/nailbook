# Forehand Nail Studio
# Booking Engine Specification

**Version:** 1.0  
**Timezone:** Asia/Tehran  
**Calendar:** Jalali (Persian)  
**Platform:** Mobile-first Web App

## 1. System Overview

This booking engine is designed to:

- Minimize dead time (empty gaps between bookings)
- Provide intelligent time suggestions
- Preserve full artist override control
- Maintain a clean, minimal, and confusion-free UX
- Operate strictly in Asia/Tehran timezone
- Support Jalali calendar transitions

All availability logic is **service-aware**, **buffer-aware**, and **shift-aware**.

## 2. Core Configuration Parameters (Artist Configurable)

| Parameter | Description | Default |
|---|---|---|
| Shift Start | Daily working start time | Required |
| Shift End | Daily working end time | Required |
| Booking Window | Number of future days visible | 7 days |
| Engine Resolution | Time slot base interval | 15 minutes |
| Buffer Time | Extra time added after each booking | 0 minutes |
| Proximity Window (Level 2) | Allowed ± range around existing bookings | ±2 hours (adjustable to ±4) |

All parameters must be dynamically adjustable by the artist.

## 3. Time & Validation Rules

### 3.1 Timezone

All calculations are based on:

```text
Asia/Tehran (server-side time)
```

Device time must never determine availability.

### 3.2 Slot Validity Formula

A slot is valid only if:

$$
slotStart + serviceDuration + buffer \le shiftEnd
$$

Additionally:

$$
slotStart > currentServerTime
$$

### 3.3 Today Behavior

If today is within shift hours but:

- No valid slot remains → show the day as **Visible + Fully Booked**
- Past time slots must not be displayed

## 4. Slot Generation Model

Engine Resolution = **15 minutes**

All services must be multiples of 15 minutes.

Examples:

- 30 min
- 45 min
- 60 min
- 75 min
- 90 min

A gap is valid if:

$$
gapDuration \ge serviceDuration + buffer
$$

If equal → valid  
If less → invalid

## 5. Gap Minimization Logic

The engine operates in levels:

### Level 1 – First Booking (Seed Booking)

If no bookings exist for a day:

- All valid shift slots are available
- No proximity restriction applied

### Level 2 – Second Booking

Only slots within:

$$
\pm proximityWindow
$$

around existing booking(s) are shown.

If none available:

- Expand from ±2h to ±4h (artist configurable)
- If still none, suggest nearest next available day

### Level 3 – Third Booking and Beyond

Priority order:

1. Fill internal dead gaps
2. Attach to earliest booking edge
3. Attach to latest booking edge
4. If none valid → suggest next day

## 6. Suggested Slots Model (Important UX Layer)

The engine divides available slots into two groups:

### 6.1 Suggested Slots (Bold UI)

These include:

- Internal gap-filling slots
- Adjacent slots (before/after existing bookings)

These must be labeled:

> "Artist Suggested Time"

Visually bold and prioritized in UI.

### 6.2 Other Available Times

All other valid slots that pass rules but are not optimal for density.

Displayed normally under:

> "Other Available Times"

## 7. Day Visibility Rules

- All 7 days must always remain visible
- Even if no valid slots exist

Day states:

| State | Visual Treatment |
|---|---|
| Today | Highlighted |
| Selected | Active state |
| Today + Selected | Combined style |
| Fully Booked | Colored + Tagged + Hatched |
| Closed | Different from Fully Booked |

If no availability in 7 days:

> "No available times within the next 7 days"

## 8. Empty State Rules

If a selected day has no valid slots:

Display:

> "No available times for this day"  
> "Only bookable times are shown"

## 9. Artist Override Rules

Artist is the **source of truth**.

The artist can:

- Add manual bookings (with or without customer data)
- Add bookings outside working hours
- Cancel bookings
- Add time blocks
- Modify shift hours

Engine must instantly recalculate availability after any change.

### 9.1 Shift Modification Conflict

If shift changes create conflicts:

System must:

- Allow saving
- Show warning:
  > "X bookings fall outside new working hours"

### 9.2 Blocking Over Existing Booking

System must:

- Warn
- Require confirmation

## 10. Concurrent Booking Protection

If two users attempt to book the same final slot:

- Final validation must occur server-side
- UI availability does not guarantee final booking
- Slot must be revalidated before confirmation

## 11. Special Calendar Cases

### 11.1 Jalali Month Transition

Date strip must properly handle month transitions.

### 11.2 Friday (Weekend)

Friday is:

- Weekend ✅
- Not automatically closed ❌

Closed status must be explicitly configured.

## 12. Service-Aware Availability

Day availability must be calculated per selected service.

A day may:

- Have availability for 30-minute service
- But not for 90-minute service

Day state must reflect selected service duration.

## 13. Summary of System Guarantees

This engine guarantees:

- No invisible dead gaps
- No partial past slots
- No shift overflow bookings
- Artist full override power
- Density-optimized scheduling
- Transparent UX messaging
- Race-condition protection
- Service-aware availability
- Buffer-aware gap calculation

## Final Architecture Philosophy

This is not a generic calendar.

This is:

> A density-optimized, artist-controlled, service-aware booking intelligence layer
> designed specifically for a single-artist nail studio.
