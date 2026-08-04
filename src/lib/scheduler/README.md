# Domain-agnostic scheduler core

This module implements the safe first slice of the Generic Smart Scheduling Engine specification as a pure TypeScript library.

## Boundary contract

The core accepts **absolute UTC epoch milliseconds** only. Resource working hours must be converted into UTC intervals by the caller. Local calendar/timezone conversion belongs at the adapter boundary; the scheduler must never use the server's local timezone.

Intervals are half-open: `[start, end)`. A placement ending at 10:00 does not conflict with another placement beginning at 10:00.

## Implemented

- Configurable duration rounding and candidate resolution
- Interval-based candidate generation from availability windows
- Existing bookings, active holds, and resource-specific blocked intervals
- Hard task windows, capability matching, capacity checks, and configurable hard/soft buffers (soft is the default)
- Explicit multi-resource capability semantics: capabilities must be present on one assigned resource unless `capabilitiesMayBeDistributed` is enabled
- Optional custom scoring-rule injection through `optimizeSchedule(..., scoringRules)`
- Simultaneous multi-resource assignments via availability intersection
- Pluggable scoring-rule shape with bounded, explainable default rules
- Deterministic ranking and rejection reasons
- Schedule version passthrough for a persistence adapter

## Deliberately not implemented in this pure core

- Database-backed holds, compare-and-set commits, idempotency, and cancellation
- Monte Carlo simulation and demand forecasting
- IANA timezone conversion and locale-specific working-hour parsing
- Durable metrics/event publishing

Those concerns must be implemented in the application/persistence layer. Do not treat an optimization result as a reservation: revalidate it atomically when committing a booking.

## Existing salon engine

`src/lib/slots.ts` remains the production salon-specific adapter for now. This module is additive and should be introduced behind a tenant feature flag or shadow comparison before replacing the current booking flow.
