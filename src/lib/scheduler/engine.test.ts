import { describe, expect, it } from "vitest";
import { optimizeSchedule, validatePlacement } from "./index";
import type { Resource, ScheduleState, Task } from "./index";

const at = (hourOfDay: number) => Date.UTC(2026, 7, 5, hourOfDay);

const resource = (id: string, start = 9, end = 18, capacity = 1, capabilities = ["basic"]): Resource => ({
  id,
  capacity,
  capabilities,
  availability: [{ start: at(start), end: at(end) }],
});

const task: Task = {
  id: "task-1",
  durationMinutes: 60,
  requiredCapabilities: ["basic"],
  earliestStart: at(9),
  latestEnd: at(18),
};

const emptyState: ScheduleState = { bookings: [], version: 7 };

describe("domain-agnostic scheduler", () => {
  it("generates aligned candidates and preserves the schedule version", () => {
    const result = optimizeSchedule(task, [resource("r1")], emptyState, { timeResolutionMinutes: 30 });
    expect(result.rejected).toBe(false);
    expect(result.scheduleVersion).toBe(7);
    expect(result.candidates[0].start % (30 * 60 * 1000)).toBe(0);
    expect(result.candidates).toHaveLength(17);
  });

  it("rounds non-grid durations up without violating availability", () => {
    const result = optimizeSchedule(
      { ...task, durationMinutes: 40 },
      [resource("r1")],
      emptyState,
      { timeResolutionMinutes: 15 }
    );
    expect(result.candidates).toHaveLength(34);
    expect(result.candidates.every((candidate) => candidate.end - candidate.start === 45 * 60 * 1000)).toBe(true);
  });

  it("subtracts existing bookings and blocked intervals", () => {
    const state: ScheduleState = {
      bookings: [{ id: "b1", resourceIds: ["r1"], start: at(11), end: at(12) }],
      blockedIntervals: [{ resourceId: "r1", start: at(14), end: at(15) }],
    };
    const result = optimizeSchedule(task, [resource("r1")], state, { timeResolutionMinutes: 60 });
    expect(result.candidates.some((candidate) => candidate.start === at(11))).toBe(false);
    expect(result.candidates.some((candidate) => candidate.start === at(14))).toBe(false);
    expect(result.candidates).toHaveLength(7);
  });

  it("supports simultaneous multi-resource assignments", () => {
    const multiTask = { ...task, requiredResourceIds: ["room", "specialist"], capabilitiesMayBeDistributed: true };
    const result = optimizeSchedule(multiTask, [
      resource("room", 9, 14, 1, []),
      resource("specialist", 10, 18, 1, ["basic"]),
    ], emptyState, { timeResolutionMinutes: 60 });
    expect(result.rejected).toBe(false);
    expect(result.candidates[0].resourceIds).toEqual(["room", "specialist"]);
    expect(result.candidates.every((candidate) => candidate.start >= at(10))).toBe(true);
    expect(result.candidates).toHaveLength(4);
  });

  it("rejects a capability mismatch instead of returning an unsafe candidate", () => {
    const result = optimizeSchedule(task, [resource("r1", 9, 18, 1, ["other"])], emptyState);
    expect(result.rejected).toBe(true);
    expect(result.candidates).toEqual([]);
    expect(result.rejectionReasons[0].code).toBe("required_resource_missing");
  });

  it("enforces capacity and hard buffers", () => {
    const state: ScheduleState = {
      bookings: [{ id: "b1", resourceIds: ["r1"], start: at(11), end: at(12), capacityDemand: 1 }],
    };
    const capacityTask = { ...task, capacityDemand: 2, bufferBeforeMinutes: 15, bufferAfterMinutes: 15 };
    const resourceWithCapacity = resource("r1", 9, 18, 2);
    const violations = validatePlacement(
      capacityTask,
      { taskId: capacityTask.id, resourceIds: ["r1"], start: at(10), end: at(11) },
      [resourceWithCapacity],
      state,
      { bufferPolicy: "hard" }
    );
    expect(violations.some((violation) => violation.code === "capacity_exceeded")).toBe(true);
  });

  it("uses soft buffers by default and enforces hard buffers when requested", () => {
    const bufferedTask = { ...task, bufferBeforeMinutes: 15, bufferAfterMinutes: 15 };
    const state: ScheduleState = {
      bookings: [{ id: "b1", resourceIds: ["r1"], start: at(11), end: at(12) }],
    };
    const soft = optimizeSchedule(bufferedTask, [resource("r1")], state, { timeResolutionMinutes: 60 });
    const hard = optimizeSchedule(bufferedTask, [resource("r1")], state, { timeResolutionMinutes: 60, bufferPolicy: "hard" });
    expect(soft.candidates.some((candidate) => candidate.start === at(10))).toBe(true);
    expect(hard.candidates.some((candidate) => candidate.start === at(10))).toBe(false);
  });

  it("enforces the raw candidate limit across all resources", () => {
    const result = optimizeSchedule(task, [resource("r1"), resource("r2")], emptyState, { maxRawCandidates: 3 });
    expect(result.candidates).toHaveLength(3);
  });

  it("supports injected scoring rules", () => {
    const result = optimizeSchedule(task, [resource("r1")], emptyState, {}, Date.now(), [{
      id: "custom",
      defaultWeight: 10,
      evaluate: () => ({ rawValue: 1, normalizedValue: 1, explanation: "Custom rule" }),
    }]);
    expect(result.candidates[0].scoreBreakdown[0].ruleId).toBe("custom");
    expect(result.candidates[0].explanation).toContain("Custom rule");
  });

  it("ranks placements with bounded explainable scores", () => {
    const state: ScheduleState = {
      bookings: [{ id: "b1", resourceIds: ["r1"], start: at(12), end: at(13) }],
    };
    const result = optimizeSchedule(task, [resource("r1")], state, { timeResolutionMinutes: 60 });
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.every((candidate) => Number.isFinite(candidate.score))).toBe(true);
    expect(result.candidates.every((candidate) => candidate.score >= -1000 && candidate.score <= 1000)).toBe(true);
    expect(result.candidates.every((candidate) => candidate.scoreBreakdown.length > 0)).toBe(true);
  });

  it("expires holds before validating availability", () => {
    const state: ScheduleState = {
      bookings: [],
      holds: [{ id: "expired", token: "old", resourceIds: ["r1"], start: at(10), end: at(11), expiresAt: at(8) }],
    };
    const result = optimizeSchedule(task, [resource("r1")], state, {}, at(9));
    expect(result.candidates.some((candidate) => candidate.start === at(10))).toBe(true);
  });
});
