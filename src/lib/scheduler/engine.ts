import { ceilToResolution, intersectIntervalLists, roundDurationMinutes } from "./intervals";
import { validatePlacement } from "./constraints";
import { scorePlacement } from "./scoring";
import type {
  ConstraintViolation,
  OptimizeResult,
  Placement,
  Resource,
  ScheduleState,
  ScoredPlacement,
  SchedulerConfig,
  Task,
} from "./models";

const DEFAULT_CONFIG: Required<Pick<SchedulerConfig, "timeResolutionMinutes" | "durationRounding" | "bufferPolicy" | "maxRawCandidates" | "maxScoredCandidates">> = {
  timeResolutionMinutes: 15,
  durationRounding: "ceil",
  bufferPolicy: "soft",
  maxRawCandidates: 500,
  maxScoredCandidates: 100,
};

function configWithDefaults(config: SchedulerConfig): SchedulerConfig {
  const resolution = Number.isFinite(config.timeResolutionMinutes)
    ? Math.min(60, Math.max(1, Math.trunc(config.timeResolutionMinutes!)))
    : DEFAULT_CONFIG.timeResolutionMinutes;
  return {
    ...DEFAULT_CONFIG,
    ...config,
    timeResolutionMinutes: resolution,
    maxRawCandidates: Math.max(1, Math.trunc(config.maxRawCandidates ?? DEFAULT_CONFIG.maxRawCandidates)),
    maxScoredCandidates: Math.max(1, Math.trunc(config.maxScoredCandidates ?? DEFAULT_CONFIG.maxScoredCandidates)),
  };
}

function compatibleResources(task: Task, resources: Resource[]): Resource[] {
  const requiredIds = new Set(task.requiredResourceIds ?? []);
  const requiredCapabilities = new Set(task.requiredCapabilities ?? []);
  return resources.filter((resource) => {
    // For a multi-resource task, capabilities may be distributed across the
    // assigned set, so validate them after the group has been assembled.
    if (requiredIds.size > 0) return requiredIds.has(resource.id);
    const capabilities = new Set(resource.capabilities ?? []);
    return [...requiredCapabilities].every((capability) => capabilities.has(capability));
  });
}

function resourceGroups(task: Task, resources: Resource[]): Resource[][] {
  const compatible = compatibleResources(task, resources);
  if ((task.requiredResourceIds ?? []).length > 0) {
    const byId = new Map(compatible.map((resource) => [resource.id, resource]));
    const group = (task.requiredResourceIds ?? []).map((id) => byId.get(id)).filter(Boolean) as Resource[];
    return group.length === (task.requiredResourceIds ?? []).length ? [group] : [];
  }
  return compatible.map((resource) => [resource]);
}

function generateForGroup(task: Task, group: Resource[], state: ScheduleState, config: SchedulerConfig, now: number): Placement[] {
  const resolution = config.timeResolutionMinutes!;
  const duration = roundDurationMinutes(task.durationMinutes, resolution, config.durationRounding!);
  const durationMs = duration * 60_000;
  const availability = intersectIntervalLists(group.map((resource) => resource.availability));
  const candidates: Placement[] = [];

  for (const window of availability) {
    const start = Math.max(window.start, task.earliestStart);
    const first = ceilToResolution(start, resolution);
    for (let candidateStart = first; candidateStart + durationMs <= Math.min(window.end, task.latestEnd); candidateStart += resolution * 60_000) {
      const candidate: Placement = {
        taskId: task.id,
        resourceIds: group.map((resource) => resource.id),
        start: candidateStart,
        end: candidateStart + durationMs,
      };
      const violations = validatePlacement(task, candidate, group, state, config, now);
      if (violations.length === 0) candidates.push(candidate);
      if (candidates.length >= config.maxRawCandidates!) return candidates;
    }
  }
  return candidates;
}

export function generateCandidates(
  task: Task,
  resources: Resource[],
  state: ScheduleState,
  config: SchedulerConfig = {},
  now: number = Date.now()
): { candidates: Placement[]; rejectionReasons: ConstraintViolation[] } {
  const normalized = configWithDefaults(config);
  const groups = resourceGroups(task, resources);
  if (groups.length === 0) {
    return {
      candidates: [],
      rejectionReasons: [{ code: "required_resource_missing", message: "No resource satisfies the task requirements." }],
    };
  }

  const candidates = groups
    .flatMap((group) => generateForGroup(task, group, state, normalized, now))
    .slice(0, normalized.maxRawCandidates);
  if (candidates.length > 0) return { candidates, rejectionReasons: [] };
  return {
    candidates: [],
    rejectionReasons: [{ code: "outside_availability", message: "No valid placement satisfies the current constraints." }],
  };
}

export function optimizeSchedule(
  task: Task,
  resources: Resource[],
  state: ScheduleState,
  config: SchedulerConfig = {},
  now: number = Date.now(),
  scoringRules: import("./scoring").ScoringRule[] = []
): OptimizeResult {
  const startedAt = Date.now();
  const normalized = configWithDefaults(config);
  const generated = generateCandidates(task, resources, state, normalized, now);
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  const scored: ScoredPlacement[] = generated.candidates
    .slice(0, normalized.maxScoredCandidates)
    .map((placement) => {
      const contextResources = placement.resourceIds.map((id) => byId.get(id)).filter(Boolean) as Resource[];
      const result = scorePlacement({ task, placement, resources: contextResources, state, config: normalized }, scoringRules);
      return {
        ...placement,
        score: result.score,
        scoreBreakdown: result.breakdown,
        explanation: result.explanation,
      };
    })
    .sort((a, b) => b.score - a.score || a.start - b.start || a.resourceIds.join(",").localeCompare(b.resourceIds.join(",")));

  return {
    taskId: task.id,
    candidates: scored,
    rejected: scored.length === 0,
    rejectionReasons: scored.length === 0 ? generated.rejectionReasons : [],
    scheduleVersion: state.version,
    computeTimeMs: Date.now() - startedAt,
  };
}

export { configWithDefaults };
