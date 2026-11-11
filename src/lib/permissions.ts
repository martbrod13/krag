import type { CircleRole, Permission } from "@/generated/prisma/client";

/**
 * What each role may see and do by default (docs/mapa-danych.md, "Decyzje").
 * A professional caregiver gets everything needed for care; documents only
 * when the family allows it. Only coordinators manage the circle.
 */
export const DEFAULT_PERMISSIONS: Record<CircleRole, Permission[]> = {
  COORDINATOR: ["PROFILE", "HEALTH", "TASKS", "VISITS", "DOCUMENTS", "MANAGE"],
  FAMILY: ["PROFILE", "HEALTH", "TASKS", "VISITS", "DOCUMENTS"],
  CAREGIVER: ["PROFILE", "HEALTH", "TASKS", "VISITS"],
};

/** Roles a coordinator can invite, in the order shown on the invite screen. */
export const INVITABLE_ROLES: CircleRole[] = [
  "FAMILY",
  "CAREGIVER",
  "COORDINATOR",
];

export function isInvitableRole(value: unknown): value is CircleRole {
  return (
    typeof value === "string" &&
    (INVITABLE_ROLES as readonly string[]).includes(value)
  );
}

/** All roles, in the order shown in the circle settings. */
export const ROLES: CircleRole[] = ["COORDINATOR", "FAMILY", "CAREGIVER"];

export function isRole(value: unknown): value is CircleRole {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

/**
 * What a coordinator can switch on or off for family members and
 * caregivers. Coordinators always have everything, including MANAGE.
 */
export const EDITABLE_PERMISSIONS: Permission[] = [
  "PROFILE",
  "HEALTH",
  "TASKS",
  "VISITS",
  "DOCUMENTS",
];

/** Keeps only permissions a coordinator may hand out, in a fixed order. */
export function editablePermissions(values: readonly unknown[]) {
  return EDITABLE_PERMISSIONS.filter((permission) =>
    values.includes(permission),
  );
}
