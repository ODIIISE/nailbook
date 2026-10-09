import { describe, expect, it } from "vitest";
import { can, isStaff, staffRoles } from "./owner-auth";

describe("staff role presets", () => {
  it("grants the owner every permission", () => {
    expect(isStaff(["customer", "owner"])).toBe(true);
    expect(can(["customer", "owner"], "users.manage")).toBe(true);
    expect(can(["customer", "owner"], "settings.edit")).toBe(true);
    expect(can(["customer", "owner"], "timeline.all")).toBe(true);
  });

  it("keeps managers away from user administration and settings", () => {
    const roles = ["customer", "manager"];
    expect(isStaff(roles)).toBe(true);
    expect(can(roles, "bookings.manage")).toBe(true);
    expect(can(roles, "bookings.paid")).toBe(true);
    expect(can(roles, "schedule.edit")).toBe(true);
    expect(can(roles, "services.edit")).toBe(true);
    expect(can(roles, "logs.view")).toBe(true);
    expect(can(roles, "timeline.all")).toBe(true);
    expect(can(roles, "users.manage")).toBe(false);
    expect(can(roles, "settings.edit")).toBe(false);
  });

  it("limits artists to their own bookings surface", () => {
    const roles = ["customer", "artist"];
    expect(isStaff(roles)).toBe(true);
    expect(can(roles, "bookings.manage")).toBe(true);
    expect(can(roles, "timeline.all")).toBe(false);
    expect(can(roles, "bookings.paid")).toBe(false);
    expect(can(roles, "schedule.edit")).toBe(false);
    expect(can(roles, "services.edit")).toBe(false);
    expect(can(roles, "users.manage")).toBe(false);
    expect(can(roles, "logs.view")).toBe(false);
    expect(can(roles, "settings.edit")).toBe(false);
  });

  it("grants the timeline to owners and managers, not artists", () => {
    expect(can(["customer", "owner"], "timeline.all")).toBe(true);
    expect(can(["customer", "manager"], "timeline.all")).toBe(true);
    expect(can(["customer", "artist"], "timeline.all")).toBe(false);
  });

  it("treats plain customers as non-staff", () => {
    expect(isStaff(["customer"])).toBe(false);
    expect(isStaff([])).toBe(false);
    expect(can(["customer"], "bookings.manage")).toBe(false);
  });

  it("ignores unknown role strings", () => {
    expect(staffRoles(["customer", "superadmin"])).toEqual([]);
    expect(can(["superadmin"], "timeline.all")).toBe(false);
  });
});
