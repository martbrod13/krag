import type { CircleRole } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import { db } from "@/lib/db";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { hashToken, newToken } from "@/lib/tokens";

/** An invitation link works once, for 7 days (docs/mapa-danych.md). */
export const INVITATION_DAYS = 7;

/**
 * Creates a one-time invitation and returns its token. The caller must
 * check that the inviter may manage the circle.
 */
export async function createInvitation(params: {
  circleId: string;
  invitedById: string;
  role: CircleRole;
}) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 24 * 3600 * 1000);

  const invitation = await db.$transaction(async (tx) => {
    const created = await tx.invitation.create({
      data: {
        circleId: params.circleId,
        invitedById: params.invitedById,
        role: params.role,
        permissions: DEFAULT_PERMISSIONS[params.role],
        tokenHash: hashToken(token),
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });
    await logAccess(
      {
        circleId: params.circleId,
        userId: params.invitedById,
        action: "CREATE",
        entity: "Invitation",
        entityId: created.id,
      },
      tx,
    );
    return created;
  });

  return { token, ...invitation };
}

/** What the invited person sees before joining, or null if the link is no longer valid. */
export async function findInvitation(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      role: true,
      expiresAt: true,
      circle: { select: { id: true, name: true } },
      invitedBy: { select: { name: true } },
    },
  });
  if (!invitation) return null;
  if (invitation.expiresAt <= new Date()) {
    await db.invitation.deleteMany({ where: { id: invitation.id } });
    return null;
  }
  return invitation;
}

export type AcceptResult =
  | { status: "joined"; circleId: string }
  | { status: "already-member"; circleId: string }
  | { status: "invalid" };

/**
 * Adds the user to the circle with the invited role and permissions, then
 * deletes the invitation so the link cannot be used again.
 */
export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<AcceptResult> {
  return db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!invitation || invitation.expiresAt <= new Date()) {
      return { status: "invalid" };
    }

    const existing = await tx.membership.findUnique({
      where: { circleId_userId: { circleId: invitation.circleId, userId } },
      select: { id: true },
    });
    if (existing) {
      return { status: "already-member", circleId: invitation.circleId };
    }

    // Deleting first makes a second, parallel use of the same link fail.
    const used = await tx.invitation.deleteMany({
      where: { id: invitation.id },
    });
    if (used.count === 0) return { status: "invalid" };

    const membership = await tx.membership.create({
      data: {
        circleId: invitation.circleId,
        userId,
        role: invitation.role,
        permissions: invitation.permissions,
        invitedById: invitation.invitedById,
      },
      select: { id: true },
    });
    await logAccess(
      {
        circleId: invitation.circleId,
        userId,
        action: "CREATE",
        entity: "Membership",
        entityId: membership.id,
      },
      tx,
    );
    return { status: "joined", circleId: invitation.circleId };
  });
}

/** Deletes a pending invitation of the circle. Returns false if there was none. */
export async function cancelInvitation(params: {
  circleId: string;
  invitationId: string;
  userId: string;
}) {
  return db.$transaction(async (tx) => {
    const deleted = await tx.invitation.deleteMany({
      where: { id: params.invitationId, circleId: params.circleId },
    });
    if (deleted.count === 0) return false;
    await logAccess(
      {
        circleId: params.circleId,
        userId: params.userId,
        action: "DELETE",
        entity: "Invitation",
        entityId: params.invitationId,
      },
      tx,
    );
    return true;
  });
}
