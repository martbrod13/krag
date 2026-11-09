import type { CircleRole } from "@/generated/prisma/client";
import { db } from "@/lib/db";

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
