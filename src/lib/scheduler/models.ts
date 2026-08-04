export type UnixMillis = number;

export interface Interval {
  /** Inclusive start, exclusive end: [start, end). */
  start: UnixMillis;
  end: UnixMillis;
}

export interface Resource {
  id: string;
  name?: string;
  type?: string;
  capabilities?: string[];
  /** Maximum simultaneous capacity for this resource. */
  capacity?: number;
  /** Absolute UTC availability windows. */
  availability: Interval[];
}

export interface Task {
  id: string;
  durationMinutes: number;
  requiredCapabilities?: string[];
  /** When present, all listed resources must be assigned simultaneously. */
  requiredResourceIds?: string[];
  /** If true, required capabilities may be distributed across assigned resources. */
  capabilitiesMayBeDistributed?: boolean;
  capacityDemand?: number;
  value?: number;
  priority?: number;
  earliestStart: UnixMillis;
  latestEnd: UnixMillis;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  preferredTime?: "morning" | "afternoon" | "evening";
}

export interface Booking {
  id: string;
  resourceIds: string[];
  start: UnixMillis;
  end: UnixMillis;
  capacityDemand?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  status?: string;
}

export interface Hold {
  id: string;
  token: string;
  resourceIds: string[];
  start: UnixMillis;
  end: UnixMillis;
  expiresAt: UnixMillis;
  capacityDemand?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
}

export interface BlockedInterval {
  resourceId: string;
  start: UnixMillis;
  end: UnixMillis;
}

export interface ScheduleState {
  bookings: Booking[];
  holds?: Hold[];
  blockedIntervals?: BlockedInterval[];
  version?: number;
}

export type BufferPolicy = "hard" | "soft";
export type DurationRounding = "ceil" | "floor" | "nearest";

export interface RuleConfig {
  enabled?: boolean;
  weight?: number;
  parameters?: Record<string, number | string | boolean>;
}

export interface SchedulerConfig {
  timeResolutionMinutes?: number;
  durationRounding?: DurationRounding;
  bufferPolicy?: BufferPolicy;
  maxRawCandidates?: number;
  maxScoredCandidates?: number;
  minUsefulDurationMinutes?: number;
  scoreClamp?: { min: number; max: number };
  rules?: Record<string, RuleConfig>;
}

export interface NormalizedScore {
  ruleId: string;
  rawValue: number;
  normalizedValue: number;
  weight: number;
  weightedValue: number;
  explanation: string;
}

export interface Placement {
  taskId: string;
  resourceIds: string[];
  start: UnixMillis;
  end: UnixMillis;
}

export interface ScoredPlacement extends Placement {
  score: number;
  scoreBreakdown: NormalizedScore[];
  explanation: string[];
}

export type ConstraintCode =
  | "invalid_interval"
  | "unknown_resource"
  | "missing_capability"
  | "required_resource_missing"
  | "capacity_exceeded"
  | "outside_availability"
  | "blocked"
  | "overlap"
  | "outside_task_window"
  | "resolution_mismatch";

export interface ConstraintViolation {
  code: ConstraintCode;
  resourceId?: string;
  message: string;
}

export interface OptimizeResult {
  taskId: string;
  candidates: ScoredPlacement[];
  rejected: boolean;
  rejectionReasons: ConstraintViolation[];
  scheduleVersion?: number;
  computeTimeMs: number;
}
