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
