import { expandInterval, intervalDurationMinutes } from "./intervals";
import type {
  NormalizedScore,
  Placement,
  Resource,
  ScheduleState,
  SchedulerConfig,
  Task,
} from "./models";

export interface ScoreContext {
  task: Task;
  placement: Placement;
  resources: Resource[];
  state: ScheduleState;
  config: SchedulerConfig;
}

export interface ScoringRule {
  id: string;
  defaultWeight: number;
  evaluate(context: ScoreContext): { rawValue: number; normalizedValue: number; explanation: string };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function occupiedOnResource(context: ScoreContext, resourceId: string) {
  return context.state.bookings
    .filter((booking) => booking.resourceIds.includes(resourceId))
    .map((booking) => expandInterval(booking, booking.bufferBeforeMinutes ?? 0, booking.bufferAfterMinutes ?? 0))
    .sort((a, b) => a.start - b.start);
}

const adjacencyRule: ScoringRule = {
  id: "adjacent_task_bonus",
  defaultWeight: 25,
  evaluate(context) {
    const candidate = context.placement;
    const adjacent = context.placement.resourceIds.some((resourceId) => occupiedOnResource(context, resourceId)
      .some((interval) => interval.end === candidate.start || interval.start === candidate.end));
    return {
      rawValue: adjacent ? 1 : 0,
      normalizedValue: adjacent ? 1 : 0,
      explanation: adjacent ? "Placement sits directly next to an existing task." : "Placement does not create direct adjacency.",
    };
  },
};

const deadGapRule: ScoringRule = {
  id: "dead_gap_penalty",
  defaultWeight: 100,
  evaluate(context) {
    const minimum = Math.max(0, context.config.minUsefulDurationMinutes ?? 30);
    const candidate = context.placement;
    let smallestResidual = Number.POSITIVE_INFINITY;
    for (const resourceId of candidate.resourceIds) {
      const occupied = occupiedOnResource(context, resourceId);
      const previous = [...occupied].reverse().find((interval) => interval.end <= candidate.start);
      const next = occupied.find((interval) => interval.start >= candidate.end);
      const before = previous ? intervalDurationMinutes({ start: previous.end, end: candidate.start }) : 0;
      const after = next ? intervalDurationMinutes({ start: candidate.end, end: next.start }) : 0;
      if (before > 0) smallestResidual = Math.min(smallestResidual, before);
      if (after > 0) smallestResidual = Math.min(smallestResidual, after);
    }
    const createsDeadGap = smallestResidual < minimum;
    return {
      rawValue: createsDeadGap ? -1 : 0,
      normalizedValue: createsDeadGap ? -1 : 0,
      explanation: createsDeadGap
        ? `Leaves a ${Math.round(smallestResidual)}-minute gap smaller than the useful-gap threshold.`
        : "Does not leave a small residual gap around an existing task.",
    };
  },
};

const boundaryRule: ScoringRule = {
  id: "availability_boundary_bonus",
  defaultWeight: 15,
  evaluate(context) {
    const candidate = context.placement;
    const touchesBoundary = context.resources.some((resource) => resource.availability.some((window) =>
      window.start === candidate.start || window.end === candidate.end));
    return {
      rawValue: touchesBoundary ? 1 : 0,
      normalizedValue: touchesBoundary ? 1 : 0,
      explanation: touchesBoundary ? "Aligns with a resource availability boundary." : "Sits inside an availability window.",
    };
  },
};

const preferenceRule: ScoringRule = {
  id: "preferred_time_bonus",
  defaultWeight: 10,
  evaluate(context) {
    const preferred = context.task.preferredTime;
    if (!preferred) return { rawValue: 0, normalizedValue: 0, explanation: "No preferred time was specified." };
    const hour = new Date(context.placement.start).getUTCHours();
    const matches = preferred === "morning" ? hour < 12 : preferred === "afternoon" ? hour >= 12 && hour < 17 : hour >= 17;
    return {
      rawValue: matches ? 1 : -1,
      normalizedValue: matches ? 1 : -1,
      explanation: matches ? `Matches the requested ${preferred} time.` : `Does not match the requested ${preferred} time.`,
    };
  },
};

const rules: ScoringRule[] = [adjacencyRule, deadGapRule, boundaryRule, preferenceRule];

export function scorePlacement(
  context: ScoreContext,
  customRules: ScoringRule[] = []
): { score: number; breakdown: NormalizedScore[]; explanation: string[] } {
  const activeRules = customRules.length > 0 ? customRules : rules;
  const breakdown = activeRules
    .map((rule) => {
      const config = context.config.rules?.[rule.id];
      if (config?.enabled === false) return null;
      const result = rule.evaluate(context);
      const normalizedValue = clamp(Number.isFinite(result.normalizedValue) ? result.normalizedValue : 0, -1, 1);
      const weight = Number.isFinite(config?.weight) ? config!.weight! : rule.defaultWeight;
      const weightedValue = normalizedValue * weight;
      return {
        ruleId: rule.id,
        rawValue: Number.isFinite(result.rawValue) ? result.rawValue : 0,
        normalizedValue,
        weight,
        weightedValue,
        explanation: result.explanation,
      } satisfies NormalizedScore;
    })
    .filter((item): item is NormalizedScore => item !== null);
  const rawScore = breakdown.reduce((sum, item) => sum + item.weightedValue, 0);
  const min = context.config.scoreClamp?.min ?? -1000;
  const max = context.config.scoreClamp?.max ?? 1000;
  const score = Number(clamp(rawScore, min, max).toFixed(4));
  return { score, breakdown, explanation: breakdown.filter((item) => item.normalizedValue !== 0).map((item) => item.explanation) };
}

/** Exported for custom rule tests and future adapters. */
export function boundedScore(value: number, min = -1, max = 1): number {
  return clamp(Number.isFinite(value) ? value : 0, min, max);
}
