import { describe, expect, it } from "vitest";
import { sortActiveServices } from "./booking-cta";
import type { Service } from "@/lib/types";

const service = (id: string, sort_order: number, is_active = true): Service => ({
  id,
  name: id,
  description: "",
  duration_minutes: 30,
  price: 100,
  is_active,
  sort_order,
  addon_ids: [],
  priority_score: 0,
  best_for: [],
});

describe("sortActiveServices", () => {
  it("returns only active services in owner-defined order", () => {
    expect(sortActiveServices([
      service("later", 20),
      service("inactive", 0, false),
      service("first", 1),
    ]).map(({ id }) => id)).toEqual(["first", "later"]);
  });

  it("does not mutate the context service array", () => {
    const input = [service("later", 2), service("first", 1)];
    sortActiveServices(input);
    expect(input.map(({ id }) => id)).toEqual(["later", "first"]);
  });
});
