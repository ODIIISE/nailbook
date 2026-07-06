# Booking Engine — Final Spec

## Services (from database)

| Name | Duration | Price | Priority |
|------|----------|-------|----------|
| ژلیش ناخن | 45m | 350K | 7 |
| فرنچ ناخن | 60m | 450K | 8 |
| طراحی ناخن | 90m | 600K | 10 |
| پدیکور | 60m | 400K | 6 |
| ترمیم ناخن | 45m | 300K | 5 |

## Addons (affect total duration)

| Name | Extra Time | Extra Cost |
|------|-----------|------------|
| سنگ ناخن | +5m | +30K |
| کروم | +15m | +150K |
| فرنچ | +0m | +100K |
| آمبره | +15m | +150K |
| طراحی ساده | +15m | +5K |
| طراحی سه بعدی | +30m | +30K |

## Rules

### Working Hours
- Default: 12:00 – 18:00
- Can extend past 18:00 if a service starts before closing
- If 80% of 12-6 is full → open 10:00–12:00 as well

### Duration Rounding
Standard slots: 15, 30, 45, 60, 90, 120 minutes

| Raw Duration | Rounded To |
|-------------|-----------|
| 1–15 | 15 |
| 16–30 | 30 |
| 31–45 | 45 |
| 46–60 | 60 |
| 61–90 | 90 |
| 91–120 | 120 |

### Buffer
- 15 minutes added after each service
- Occupied block = rounded duration + buffer

### Slot Interval
- 30 minutes between available start times
- Next slot must land on :00 or :30

### Dead Gap Removal
- Any slot leaving a 1–14 minute remainder is hard-removed
- This is mandatory, not a soft penalty

### Preferred Slots
- Round-hour slots (10:00, 11:00, 12:00...) get priority
- Adjacent-to-booking slots get priority

### Scoring Formula
```
Score = 0.4 × Fitness + 0.2 × ValuePriority − 0.1 × AdjacencyDistance
```
- Fitness: how well slot uses the free interval
- ValuePriority: service priority_score / 10
- AdjacencyDistance: time distance to nearest booking (normalized)

### Output
- Return 4–6 curated slots
- One marked "Recommended"
- If no slots today → scan forward 14 days

## Pipeline (6 Steps)

1. Build free intervals from working hours minus bookings/blocks
2. Generate candidates at 15-min steps within each interval
3. Hard remove dead gaps (remainder 0 < R < 15)
4. Mark round-hour and adjacent-to-booking slots
5. Score and rank
6. Return final list

## Examples

### ژلیش (45m) + کروم (+15m) = 60m
- Rounded: 60
- + Buffer: 75
- Start 12:00 → ends 13:15
- Next slot: 13:30

### ژلیش (45m) + آمبره (+15m) + سنگ (+5m) = 65m
- Rounded: 90 (passes 60)
- + Buffer: 105
- Start 12:00 → ends 13:45
- Next slot: 14:00

### طراحی (90m) alone
- Rounded: 90
- + Buffer: 105
- Start 12:00 → ends 13:45
- Next slot: 14:00

### پدیکور (60m) + لاک ژل پا (+15m) = 75m
- Rounded: 90 (passes 60)
- + Buffer: 105
- Start 12:00 → ends 13:45
- Next slot: 14:00
