/**
 * Client-safe mirror of the server role matrix in `src/lib/owner-auth.ts`.
 *
 * The server is the real gate — this only decides what the UI shows, so a
 * forbidden action is hidden instead of surfacing as a 403. The two must
 * never drift: `staff-permissions.test.ts` asserts parity across every
 * role × permission pair. Importing the server module here is forbidden
 * (it pulls in `@vercel/postgres`); duplicate the literals instead.
 */

export const STAFF_ROLES = ["owner", "manager", "artist"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export type StaffPermission =
  | "timeline.all"
  | "bookings.manage"
  | "bookings.paid"
  | "schedule.edit"
  | "services.edit"
  | "users.manage"
  | "logs.view"
  | "settings.edit";

const ROLE_PERMISSIONS: Record<StaffRole, readonly StaffPermission[]> = {
  owner: [
    "timeline.all",
    "bookings.manage",
    "bookings.paid",
    "schedule.edit",
    "services.edit",
    "users.manage",
    "logs.view",
    "settings.edit",
  ],
  manager: [
    "timeline.all",
    "bookings.manage",
    "bookings.paid",
    "schedule.edit",
    "services.edit",
    "logs.view",
  ],
  artist: ["bookings.manage"],
};

export function staffRoles(roles: readonly string[] | undefined): StaffRole[] {
  if (!roles) return [];
  return STAFF_ROLES.filter((r) => roles.includes(r));
}

export function isStaff(roles: readonly string[] | undefined): boolean {
  return staffRoles(roles).length > 0;
}

export function can(roles: readonly string[] | undefined, permission: StaffPermission): boolean {
  return staffRoles(roles).some((r) => ROLE_PERMISSIONS[r].includes(permission));
}
