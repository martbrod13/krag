import type { CircleRole, Permission } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import { db } from "@/lib/db";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";

export type MyCircle = {
  id: string;
  name: string;
  role: CircleRole;
  recipient: {
    firstName: string;
    /** Shown only to people with access to the care recipient's profile. */
    age: number | null;
    city: string | null;
  } | null;
};

/** Full years between the birth date and today (dates compared in UTC). */
export function ageInYears(birthDate: Date, today: Date) {
  const age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed =
    today.getUTCMonth() > birthDate.getUTCMonth() ||
    (today.getUTCMonth() === birthDate.getUTCMonth() &&
      today.getUTCDate() >= birthDate.getUTCDate());
  return birthdayPassed ? age : age - 1;
}

/** Circles the user belongs to, newest first, optionally only with one role. */
export async function getMyCircles(
  userId: string,
  role?: CircleRole,
): Promise<MyCircle[]> {
  const memberships = await db.membership.findMany({
    where: { userId, ...(role ? { role } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      permissions: true,
      circle: {
        select: {
          id: true,
          name: true,
          recipient: {
            select: { firstName: true, birthDate: true, city: true },
          },
        },
      },
    },
  });

  const today = new Date();
  return memberships.map(({ role, permissions, circle }) => {
    const recipient = circle.recipient;
    const seesProfile = permissions.includes("PROFILE");
    return {
      id: circle.id,
      name: circle.name,
      role,
      recipient: recipient
        ? {
            firstName: recipient.firstName,
            age:
              seesProfile && recipient.birthDate
                ? ageInYears(recipient.birthDate, today)
                : null,
            city: seesProfile ? recipient.city : null,
          }
        : null,
    };
  });
}

export type NewCircleInput = {
  name: string;
  firstName: string;
  birthDate: Date | null;
  city: string | null;
};

export type NewCircleError =
  | "nameRequired"
  | "firstNameRequired"
  | "birthDateInvalid";

/** Checks the "new circle" form. Text is trimmed and shortened to safe lengths. */
export function parseNewCircle(
  fields: Record<string, unknown>,
  today: Date,
): { input: NewCircleInput } | { error: NewCircleError } {
  const text = (key: string, max: number) =>
    String(fields[key] ?? "")
      .trim()
      .slice(0, max);

  const name = text("name", 80);
  const firstName = text("firstName", 60);
  const city = text("city", 80);
  const birthDateText = text("birthDate", 10);

  if (!name) return { error: "nameRequired" };
  if (!firstName) return { error: "firstNameRequired" };

  let birthDate: Date | null = null;
  if (birthDateText) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateText)) {
      return { error: "birthDateInvalid" };
    }
    birthDate = new Date(`${birthDateText}T00:00:00Z`);
    const valid =
      !Number.isNaN(birthDate.getTime()) &&
      birthDate.toISOString().startsWith(birthDateText) &&
      birthDate.getUTCFullYear() >= 1900 &&
      birthDate <= today;
    if (!valid) return { error: "birthDateInvalid" };
  }

  return { input: { name, firstName, birthDate, city: city || null } };
}

export async function isMember(circleId: string, userId: string) {
  const membership = await db.membership.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { id: true },
  });
  return membership !== null;
}

/** Creates a circle; the person who creates it becomes its coordinator. */
export async function createCircle(userId: string, input: NewCircleInput) {
  return db.$transaction(async (tx) => {
    const circle = await tx.careCircle.create({
      data: {
        name: input.name,
        recipient: {
          create: {
            firstName: input.firstName,
            birthDate: input.birthDate,
            city: input.city,
          },
        },
        memberships: {
          create: {
            userId,
            role: "COORDINATOR",
            permissions: DEFAULT_PERMISSIONS.COORDINATOR,
          },
        },
      },
      select: { id: true },
    });
    await logAccess(
      {
        circleId: circle.id,
        userId,
        action: "CREATE",
        entity: "CareCircle",
        entityId: circle.id,
      },
      tx,
    );
    return circle;
  });
}

export type CircleView = {
  id: string;
  name: string;
  role: CircleRole;
  permissions: Permission[];
  recipient: {
    firstName: string;
    age: number | null;
    city: string | null;
    address: string | null;
  } | null;
  members: { userId: string; name: string; role: CircleRole }[];
  /** Pending invitations, only for people who manage the circle. */
  invitations: { id: string; role: CircleRole; expiresAt: Date }[] | null;
};

/**
 * Everything a member may see on the circle page, or null when the user is
 * not in the circle. Profile details need the PROFILE permission.
 */
export async function getCircleForMember(
  circleId: string,
  userId: string,
): Promise<CircleView | null> {
  const membership = await db.membership.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: {
      role: true,
      permissions: true,
      circle: {
        select: {
          id: true,
          name: true,
          recipient: {
            select: {
              firstName: true,
              birthDate: true,
              city: true,
              address: true,
            },
          },
          memberships: {
            orderBy: { createdAt: "asc" },
            select: { role: true, user: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!membership) return null;

  const { circle, permissions } = membership;
  const seesProfile = permissions.includes("PROFILE");
  const manages = permissions.includes("MANAGE");
  const recipient = circle.recipient;

  const invitations = manages
    ? await db.invitation.findMany({
        where: { circleId, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { id: true, role: true, expiresAt: true },
      })
    : null;

  return {
    id: circle.id,
    name: circle.name,
    role: membership.role,
    permissions,
    recipient: recipient
      ? {
          firstName: recipient.firstName,
          age:
            seesProfile && recipient.birthDate
              ? ageInYears(recipient.birthDate, new Date())
              : null,
          city: seesProfile ? recipient.city : null,
          address: seesProfile ? recipient.address : null,
        }
      : null,
    members: circle.memberships.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      role: member.role,
    })),
    invitations,
  };
}
