import type { CircleRole, Permission } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import { type Contact, contactFields, contactOrder } from "@/lib/contacts";
import { timeInPoland, todayInPoland } from "@/lib/dates";
import { db } from "@/lib/db";
import { countMissedDoses } from "@/lib/medications";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { countOpenTasks, type OpenTaskCounts } from "@/lib/tasks";

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
  /** Open tasks today and late ones; only for people who see tasks. */
  tasks: OpenTaskCounts | null;
  /** Today's doses not confirmed in time; only with access to health data. */
  missedDoses: number | null;
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

/** Circles the user belongs to, newest first, for "My circles". */
export async function getMyCircles(userId: string): Promise<MyCircle[]> {
  const memberships = await db.membership.findMany({
    where: { userId },
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

  const circlesWith = (permission: Permission) =>
    memberships
      .filter((membership) => membership.permissions.includes(permission))
      .map((membership) => membership.circle.id);
  const today = todayInPoland();
  const [taskCounts, missedDoses] = await Promise.all([
    countOpenTasks(circlesWith("TASKS"), today),
    countMissedDoses(circlesWith("HEALTH"), today, timeInPoland()),
  ]);

  const now = new Date();
  return memberships.map(({ role, permissions, circle }) => {
    const recipient = circle.recipient;
    const seesProfile = permissions.includes("PROFILE");
    return {
      id: circle.id,
      name: circle.name,
      role,
      tasks: taskCounts.get(circle.id) ?? null,
      missedDoses: missedDoses.get(circle.id) ?? null,
      recipient: recipient
        ? {
            firstName: recipient.firstName,
            age:
              seesProfile && recipient.birthDate
                ? ageInYears(recipient.birthDate, now)
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

/** The circle form: a new circle, or changes to the care recipient's data. */
export type CircleFormInput = NewCircleInput & {
  address: string | null;
  primaryDoctor: string | null;
};

type MissingFieldError = "nameRequired" | "firstNameRequired";
export type CircleFormError = MissingFieldError | "birthDateInvalid";

/**
 * Checks the circle form. Text is trimmed and shortened to safe lengths,
 * and empty optional fields become null.
 */
export function parseCircleForm(
  fields: Record<string, unknown>,
  today: Date,
): { input: CircleFormInput } | { error: CircleFormError } {
  const text = (key: string, max: number) =>
    String(fields[key] ?? "")
      .trim()
      .slice(0, max);

  const name = text("name", 80);
  const firstName = text("firstName", 60);
  const city = text("city", 80);
  const address = text("address", 160);
  const primaryDoctor = text("primaryDoctor", 120);
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

  return {
    input: {
      name,
      firstName,
      birthDate,
      city: city || null,
      address: address || null,
      primaryDoctor: primaryDoctor || null,
    },
  };
}

export async function isMember(circleId: string, userId: string) {
  const membership = await db.membership.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { id: true },
  });
  return membership !== null;
}

/** Whether a member of the circle has a permission. False for outsiders. */
export async function hasPermission(
  circleId: string,
  userId: string,
  permission: Permission,
) {
  const membership = await db.membership.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { permissions: true },
  });
  return membership?.permissions.includes(permission) ?? false;
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
    primaryDoctor: string | null;
  } | null;
  members: { userId: string; name: string; role: CircleRole }[];
  /** Emergency contacts, for people with access to the profile. */
  contacts: Contact[] | null;
  /** Pending invitations, only for people who manage the circle. */
  invitations: { id: string; role: CircleRole; expiresAt: Date }[] | null;
  /** Paired senior devices, only for people who manage the circle. */
  devices: DeviceView[] | null;
};

export type DeviceView = {
  id: string;
  name: string;
  pairedAt: Date;
  lastUsedAt: Date | null;
  pairedBy: string | null;
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
              primaryDoctor: true,
              emergencyContacts: {
                orderBy: contactOrder,
                select: contactFields,
              },
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

  const [invitations, devices] = manages
    ? await Promise.all([
        db.invitation.findMany({
          where: { circleId, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
          select: { id: true, role: true, expiresAt: true },
        }),
        db.pairedDevice.findMany({
          where: { circleId },
          orderBy: { pairedAt: "asc" },
          select: {
            id: true,
            name: true,
            pairedAt: true,
            lastUsedAt: true,
            pairedBy: { select: { name: true } },
          },
        }),
      ])
    : ([null, null] as const);

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
          primaryDoctor: seesProfile ? recipient.primaryDoctor : null,
        }
      : null,
    members: circle.memberships.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      role: member.role,
    })),
    contacts: seesProfile ? (recipient?.emergencyContacts ?? []) : null,
    invitations,
    devices:
      devices?.map(({ pairedBy, ...device }) => ({
        ...device,
        pairedBy: pairedBy?.name ?? null,
      })) ?? null,
  };
}

const recipientFields = {
  firstName: true,
  birthDate: true,
  city: true,
  address: true,
  primaryDoctor: true,
} as const;

/** The circle form's fields as text, e.g. a birth date as YYYY-MM-DD. */
export type CircleFormValues = Record<keyof CircleFormInput, string>;

/**
 * The circle's current data for the edit form, or null if there is no such
 * circle. The caller must check that the user may manage the circle.
 */
export async function getCircleFormValues(
  circleId: string,
): Promise<CircleFormValues | null> {
  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    select: { name: true, recipient: { select: recipientFields } },
  });
  if (!circle) return null;
  const recipient = circle.recipient;
  return {
    name: circle.name,
    firstName: recipient?.firstName ?? "",
    birthDate: recipient?.birthDate?.toISOString().slice(0, 10) ?? "",
    city: recipient?.city ?? "",
    address: recipient?.address ?? "",
    primaryDoctor: recipient?.primaryDoctor ?? "",
  };
}

/**
 * Saves the circle's name and the care recipient's data. Each part that
 * changed goes into the access log. The caller must check that the user may
 * manage the circle. Returns false if there is no such circle.
 */
export async function updateCircle(params: {
  circleId: string;
  userId: string;
  input: CircleFormInput;
}) {
  const { circleId, userId, input } = params;
  return db.$transaction(async (tx) => {
    const circle = await tx.careCircle.findUnique({
      where: { id: circleId },
      select: { name: true, recipient: { select: recipientFields } },
    });
    if (!circle) return false;

    if (circle.name !== input.name) {
      await tx.careCircle.update({
        where: { id: circleId },
        data: { name: input.name },
      });
      await logAccess(
        {
          circleId,
          userId,
          action: "UPDATE",
          entity: "CareCircle",
          entityId: circleId,
        },
        tx,
      );
    }

    const data = {
      firstName: input.firstName,
      birthDate: input.birthDate,
      city: input.city,
      address: input.address,
      primaryDoctor: input.primaryDoctor,
    };
    const before = circle.recipient;
    const changed =
      !before ||
      before.firstName !== data.firstName ||
      before.birthDate?.getTime() !== data.birthDate?.getTime() ||
      before.city !== data.city ||
      before.address !== data.address ||
      before.primaryDoctor !== data.primaryDoctor;
    if (changed) {
      await tx.careRecipient.upsert({
        where: { circleId },
        create: { circleId, ...data },
        update: data,
      });
      await logAccess(
        { circleId, userId, action: "UPDATE", entity: "CareRecipient" },
        tx,
      );
    }
    return true;
  });
}

/**
 * Whether the text typed to confirm deleting matches the circle's name.
 * Letter case and extra spaces do not matter.
 */
export function confirmsCircleName(typed: string, name: string) {
  const normalize = (value: string) =>
    value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pl");
  return normalize(typed) !== "" && normalize(typed) === normalize(name);
}

/**
 * Deletes the circle with everything in it: memberships, invitations, the
 * care recipient's data and numbers, paired devices and the access log
 * (data map, "Prawa użytkowników"). The caller must check that the user may
 * manage the circle. Returns false if there was no such circle.
 */
export async function deleteCircle(circleId: string) {
  const deleted = await db.careCircle.deleteMany({ where: { id: circleId } });
  return deleted.count > 0;
}
