import { contains, expandInterval, isValidInterval, overlaps } from "./intervals";
import type {
  ConstraintViolation,
  Placement,
  Resource,
  ScheduleState,
  SchedulerConfig,
  Task,
} from "./models";

const ACTIVE_BOOKING_STATUSES = new Set(["pending", "reserved", "confirmed", "in_progress"]);

function resourceCapacity(resource: Resource): number {
  return Number.isFinite(resource.capacity) && (resource.capacity ?? 0) > 0
    ? resource.capacity!
    : 1;
}

function taskDemand(task: Task): number {
  return Number.isFinite(task.capacityDemand) && (task.capacityDemand ?? 0) > 0
    ? task.capacityDemand!
    : 1;
}

function effectiveInterval(task: Task, placement: Pick<Placement, "start" | "end">, config: SchedulerConfig): { start: number; end: number } {
  if (config.bufferPolicy !== "hard") return placement;
  return expandInterval(
    placement,
    task.bufferBeforeMinutes ?? 0,
    task.bufferAfterMinutes ?? 0
  );
}

function activeBookings(state: ScheduleState, now: number) {
  return state.bookings.filter((booking) => !booking.status || ACTIVE_BOOKING_STATUSES.has(booking.status))
    .concat((state.holds ?? [])
      .filter((hold) => hold.expiresAt > now)
      .map((hold) => ({
        id: hold.id,
        resourceIds: hold.resourceIds,
        start: hold.start,
        end: hold.end,
        capacityDemand: hold.capacityDemand,
        bufferBeforeMinutes: hold.bufferBeforeMinutes,
        bufferAfterMinutes: hold.bufferAfterMinutes,
      })));
}

function hasRequiredCapabilities(resources: Resource[], required: string[], distributed: boolean): boolean {
  if (distributed) {
    const capabilities = new Set(resources.flatMap((resource) => resource.capabilities ?? []));
    return required.every((capability) => capabilities.has(capability));
  }
  return resources.some((resource) => {
    const capabilities = new Set(resource.capabilities ?? []);
    return required.every((capability) => capabilities.has(capability));
  });
}

export function validatePlacement(
  task: Task,
  placement: Placement,
  resources: Resource[],
  state: ScheduleState,
  config: SchedulerConfig = {},
  now: number = Date.now()
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  const assigned = placement.resourceIds.map((id) => byId.get(id));
  const interval = { start: placement.start, end: placement.end };
  const occupiedInterval = effectiveInterval(task, interval, config);
  const requiredCapabilities = task.requiredCapabilities ?? [];

  if (!isValidInterval(interval)) {
    violations.push({ code: "invalid_interval", message: "Placement must use a non-empty interval." });
    return violations;
  }
  if (interval.start < task.earliestStart || interval.end > task.latestEnd) {
    violations.push({ code: "outside_task_window", message: "Placement is outside the task time window." });
  }
  if (assigned.some((resource) => !resource)) {
    violations.push({ code: "unknown_resource", message: "Placement references an unknown resource." });
  }

  const requiredIds = task.requiredResourceIds ?? [];
  for (const resourceId of requiredIds) {
    if (!placement.resourceIds.includes(resourceId)) {
      violations.push({ code: "required_resource_missing", resourceId, message: `Required resource ${resourceId} is not assigned.` });
    }
  }

  for (const resource of assigned) {
    if (!resource) continue;
    if (!hasRequiredCapabilities(
      assigned.filter((item): item is Resource => Boolean(item)),
      requiredCapabilities,
      task.capabilitiesMayBeDistributed ?? false
    )) {
      violations.push({ code: "missing_capability", resourceId: resource.id, message: `Assigned resources do not provide all required capabilities.` });
      break;
    }

    if (!resource.availability.some((window) => contains(window, occupiedInterval))) {
      violations.push({ code: "outside_availability", resourceId: resource.id, message: `Placement is outside resource ${resource.id}'s availability.` });
    }

    if ((state.blockedIntervals ?? []).some((blocked) => blocked.resourceId === resource.id && overlaps(blocked, occupiedInterval))) {
      violations.push({ code: "blocked", resourceId: resource.id, message: `Placement overlaps a blocked interval on resource ${resource.id}.` });
    }

    const active = activeBookings(state, now).filter((booking) => booking.resourceIds.includes(resource.id));
    const demand = taskDemand(task);
    const events = [
      { time: occupiedInterval.start, delta: demand },
      { time: occupiedInterval.end, delta: -demand },
    ];
    for (const booking of active) {
      const bookingInterval = expandInterval(
        booking,
        booking.bufferBeforeMinutes ?? 0,
        booking.bufferAfterMinutes ?? 0
      );
      if (overlaps(bookingInterval, occupiedInterval)) {
        const bookingDemand = Number.isFinite(booking.capacityDemand) && (booking.capacityDemand ?? 0) > 0
          ? booking.capacityDemand!
          : 1;
        const overlapStart = Math.max(occupiedInterval.start, bookingInterval.start);
        const overlapEnd = Math.min(occupiedInterval.end, bookingInterval.end);
        events.push({ time: overlapStart, delta: bookingDemand }, { time: overlapEnd, delta: -bookingDemand });
      }
    }

    let usage = 0;
    const grouped = new Map<number, number>();
    for (const event of events) grouped.set(event.time, (grouped.get(event.time) ?? 0) + event.delta);
    for (const [time, delta] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
      usage += delta;
      if (time < occupiedInterval.end && usage > resourceCapacity(resource)) {
        violations.push({ code: "capacity_exceeded", resourceId: resource.id, message: `Resource ${resource.id} exceeds capacity.` });
        break;
      }
    }
  }

  // A placement must have at least one assigned resource. Required-resource
  // tasks may have several; ordinary tasks are generated with one.
  if (placement.resourceIds.length === 0) {
    violations.push({ code: "unknown_resource", message: "Placement must assign at least one resource." });
  }

  return violations;
}
