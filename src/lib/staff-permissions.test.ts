import { describe, expect, it } from "vitest";
import {
  can as serverCan,
  isStaff as serverIsStaff,
  STAFF_PERMISSIONS as serverPermissions,
} from "./owner-auth";
import {
  can as clientCan,
  isStaff as clientIsStaff,
  type StaffPermission,
} from "./staff-permissions";

// The client mirror must never drift from the server matrix: the server is
// the real gate, but every UI hiding decision flows through the mirror.
const ROLE_SETS: Array<{ label: string; roles: string[] }> = [
  { label: "owner", roles: ["customer", "owner"] },
  { label: "manager", roles: ["customer", "manager"] },
  { label: "artist", roles: ["customer", "artist"] },
  { label: "customer", roles: ["customer"] },
  { label: "none", roles: [] },
  { label: "multi", roles: ["customer", "manager", "artist"] },
];

describe("staff permission mirror parity", () => {
  it("exposes the same permission vocabulary as the server", () => {
    const client: readonly string[] = [
      "timeline.all",
      "bookings.manage",
      "bookings.paid",
      "schedule.edit",
      "services.edit",
      "users.manage",
      "logs.view",
      "settings.edit",
    ];
    expect([...client].sort()).toEqual([...serverPermissions].sort());
  });

  it("matches isStaff for every role set", () => {
    for (const { roles } of ROLE_SETS) {
      expect(clientIsStaff(roles)).toBe(serverIsStaff(roles));
    }
    expect(clientIsStaff(undefined)).toBe(false);
  });

  it("matches can() for every role set and permission", () => {
    for (const { label, roles } of ROLE_SETS) {
      for (const permission of serverPermissions) {
        expect(
          clientCan(roles, permission as StaffPermission),
          `${label} × ${permission}`
        ).toBe(serverCan(roles, permission));
      }
    }
  });
});
