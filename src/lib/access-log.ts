import type { AuditAction } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** The access log is kept for 12 months (data map, decision 5). */
export const ACCESS_LOG_MONTHS = 12;

export const ACCESS_LOG_PAGE_SIZE = 50;

// What happened, as a key of the AccessLog.events messages.
const EVENTS = {
  "VIEW CareRecipient": "viewRecipient",
  "UPDATE CareRecipient": "updateRecipient",
  "CREATE CareCircle": "createCircle",
  "UPDATE CareCircle": "renameCircle",
  "CREATE Invitation": "createInvitation",
  "DELETE Invitation": "cancelInvitation",
  "CREATE Membership": "join",
  "UPDATE Membership": "changeMember",
  "DELETE Membership": "removeMember",
  "CREATE DevicePairing": "createPairing",
  "CREATE PairedDevice": "pairDevice",
  "DELETE PairedDevice": "unpairDevice",
  "CREATE EmergencyContact": "addContact",
  "DELETE EmergencyContact": "removeContact",
} as const;

type KnownEvent = (typeof EVENTS)[keyof typeof EVENTS];

export type AccessEvent = KnownEvent | "seniorScreen" | "leave" | "other";

export type AccessLogEntry = {
  id: string;
  createdAt: Date;
  event: AccessEvent;
  /** Who did it: a person or the senior's device; null for a deleted account. */
  actor: string | null;
  /** The person or device the entry is about, if any. */
  subject: string | null;
};

type Row = {
  action: AuditAction;
  entity: string;
  entityId: string | null;
  userId: string | null;
};

function eventOf(row: Row, deviceName: string | null): AccessEvent {
  const kind = `${row.action} ${row.entity}`;
  if (kind === "VIEW CareRecipient" && !row.userId && deviceName) {
    return "seniorScreen";
  }
  if (kind === "DELETE Membership" && row.userId === row.entityId) {
    return "leave";
  }
  return kind in EVENTS ? EVENTS[kind as keyof typeof EVENTS] : "other";
}

/**
 * One page of the circle's access log, newest first. Entries older than
 * 12 months are deleted first. The caller must check that the user may
 * manage the circle.
 */
export async function getAccessLog(circleId: string, page = 1) {
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - ACCESS_LOG_MONTHS);
  await db.auditLog.deleteMany({
    where: { circleId, createdAt: { lt: cutoff } },
  });

  const rows = await db.auditLog.findMany({
    where: { circleId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ACCESS_LOG_PAGE_SIZE,
    take: ACCESS_LOG_PAGE_SIZE + 1,
    select: {
      id: true,
      createdAt: true,
      action: true,
      entity: true,
      entityId: true,
      userId: true,
      deviceName: true,
      user: { select: { name: true } },
      device: { select: { name: true } },
    },
  });
  const hasMore = rows.length > ACCESS_LOG_PAGE_SIZE;
  const pageRows = rows.slice(0, ACCESS_LOG_PAGE_SIZE);

  // Names of the people whom changes in the circle's members were about.
  const memberIds = new Set<string>();
  for (const row of pageRows) {
    if (row.entity === "Membership" && row.entityId)
      memberIds.add(row.entityId);
  }
  const people = memberIds.size
    ? await db.user.findMany({
        where: { id: { in: [...memberIds] } },
        select: { id: true, name: true },
      })
    : [];
  const nameOf = new Map(people.map((person) => [person.id, person.name]));

  const entries: AccessLogEntry[] = pageRows.map((row) => {
    const deviceName = row.deviceName ?? row.device?.name ?? null;
    const event = eventOf(row, deviceName);
    const subject =
      row.entity === "Membership"
        ? (nameOf.get(row.entityId ?? "") ?? null)
        : event === "seniorScreen"
          ? null
          : deviceName;
    return {
      id: row.id,
      createdAt: row.createdAt,
      event,
      actor: row.user?.name ?? (event === "seniorScreen" ? deviceName : null),
      subject,
    };
  });

  return { entries, hasMore };
}
