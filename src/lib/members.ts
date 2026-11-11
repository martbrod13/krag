import type { CircleRole, Permission } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import type { DbClient } from "@/lib/db";
import { db } from "@/lib/db";
import { DEFAULT_PERMISSIONS, editablePermissions } from "@/lib/permissions";

export type Member = {
  userId: string;
  name: string;
  role: CircleRole;
  permissions: Permission[];
};

/** Everyone in the circle with their permissions, for the circle settings. */
export async function listMembers(circleId: string): Promise<Member[]> {
  const memberships = await db.membership.findMany({
    where: { circleId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      permissions: true,
      user: { select: { id: true, name: true } },
    },
  });
  return memberships.map(({ role, permissions, user }) => ({
    userId: user.id,
    name: user.name,
    role,
    permissions,
  }));
}

export type MemberChange = "ok" | "notFound" | "lastCoordinator";

/**
 * Locks the circle's coordinators until the end of the transaction and
 * counts them, so two coordinators stepping down at the same moment cannot
 * leave the circle without one (data map, decision 7).
 */
async function lockCoordinators(tx: DbClient, circleId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Membership"
    WHERE "circleId" = ${circleId} AND "role" = 'COORDINATOR'
    FOR UPDATE`;
  return rows.length;
}

function samePermissions(a: Permission[], b: Permission[]) {
  return (
    a.length === b.length && a.every((permission) => b.includes(permission))
  );
}

/**
 * Gives a member a role and decides what they see. Coordinators get all
 * permissions; for others only EDITABLE_PERMISSIONS count. The caller must
 * check that the user may manage the circle.
 */
export async function updateMember(params: {
  circleId: string;
  memberId: string;
  role: CircleRole;
  permissions: readonly unknown[];
  userId: string;
}): Promise<MemberChange> {
  return db.$transaction(async (tx) => {
    const coordinators = await lockCoordinators(tx, params.circleId);
    const where = {
      circleId_userId: { circleId: params.circleId, userId: params.memberId },
    };
    const member = await tx.membership.findUnique({
      where,
      select: { role: true, permissions: true },
    });
    if (!member) return "notFound";

    const stepsDown =
      member.role === "COORDINATOR" && params.role !== "COORDINATOR";
    if (stepsDown && coordinators <= 1) return "lastCoordinator";

    const permissions =
      params.role === "COORDINATOR"
        ? DEFAULT_PERMISSIONS.COORDINATOR
        : editablePermissions(params.permissions);
    if (
      member.role === params.role &&
      samePermissions(member.permissions, permissions)
    ) {
      return "ok";
    }

    await tx.membership.update({
      where,
      data: { role: params.role, permissions },
    });
    await logAccess(
      {
        circleId: params.circleId,
        userId: params.userId,
        action: "UPDATE",
        entity: "Membership",
        entityId: params.memberId,
      },
      tx,
    );
    return "ok";
  });
}

/**
 * Takes a person out of the circle: a coordinator removing someone, or a
 * person leaving (memberId equal to userId). The last coordinator stays.
 * For removing someone else, the caller must check that the user may manage
 * the circle.
 */
export async function removeMember(params: {
  circleId: string;
  memberId: string;
  userId: string;
}): Promise<MemberChange> {
  return db.$transaction(async (tx) => {
    const coordinators = await lockCoordinators(tx, params.circleId);
    const where = {
      circleId_userId: { circleId: params.circleId, userId: params.memberId },
    };
    const member = await tx.membership.findUnique({
      where,
      select: { role: true },
    });
    if (!member) return "notFound";
    if (member.role === "COORDINATOR" && coordinators <= 1) {
      return "lastCoordinator";
    }

    await tx.membership.delete({ where });
    await logAccess(
      {
        circleId: params.circleId,
        userId: params.userId,
        action: "DELETE",
        entity: "Membership",
        entityId: params.memberId,
      },
      tx,
    );
    return "ok";
  });
}
