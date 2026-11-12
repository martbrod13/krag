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
  "VIEW Task": "viewPlan",
  "CREATE Task": "createTask",
  "UPDATE Task": "updateTask",
  "DELETE Task": "deleteTask",
  "UPDATE TaskAssignee": "claimTask",
  "CREATE TaskDone": "doneTask",
  "DELETE TaskDone": "undoneTask",
  "VIEW Medication": "viewMedications",
  "CREATE Medication": "createMedication",
  "UPDATE Medication": "updateMedication",
  "DELETE Medication": "deleteMedication",
  "CREATE MedicationIntake": "takeDose",
  "DELETE MedicationIntake": "undoDose",
  "VIEW Visit": "viewVisits",
  "CREATE Visit": "createVisit",
  "UPDATE Visit": "updateVisit",
  "DELETE Visit": "deleteVisit",
  "UPDATE VisitStart": "startVisit",
  "UPDATE VisitReport": "reportVisit",
  "VIEW CircleExport": "exportCircle",
} as const;

/** Entries about one task: their entityId is the task's id. */
const TASK_ENTITIES = new Set(["Task", "TaskAssignee", "TaskDone"]);

/** Entries about one medicine: their entityId is the medicine's id. */
const MEDICATION_ENTITIES = new Set(["Medication", "MedicationIntake"]);

/** Entries about one visit: their entityId is the visit's id. */
const VISIT_ENTITIES = new Set(["Visit", "VisitStart", "VisitReport"]);

type KnownEvent = (typeof EVENTS)[keyof typeof EVENTS];

export type AccessEvent = KnownEvent | "seniorScreen" | "leave" | "other";

export type AccessLogEntry = {
  id: string;
  createdAt: Date;
  event: AccessEvent;
  /** Who did it: a person or the senior's device; null for a deleted account. */
  actor: string | null;
  /**
   * The person, device, task or medicine the entry is about, if any; for a
   * visit, the person who comes.
   */
  subject: string | null;
  /**
   * What `subject` names; a deleted task, medicine or visit keeps its kind
   * but has no subject.
   */
  subjectKind: SubjectKind | null;
};

type SubjectKind = "person" | "device" | "task" | "medication" | "visit";

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

  // Names of the people whom membership changes were about, the current
  // text of the tasks, names of the medicines and who comes on the visits.
  // None of it is copied into the log itself.
  const memberIds = new Set<string>();
  const taskIds = new Set<string>();
  const medicationIds = new Set<string>();
  const visitIds = new Set<string>();
  for (const row of pageRows) {
    if (!row.entityId) continue;
    if (row.entity === "Membership") memberIds.add(row.entityId);
    if (TASK_ENTITIES.has(row.entity)) taskIds.add(row.entityId);
    if (MEDICATION_ENTITIES.has(row.entity)) medicationIds.add(row.entityId);
    if (VISIT_ENTITIES.has(row.entity)) visitIds.add(row.entityId);
  }
  const [people, tasks, medications, visits] = await Promise.all([
    memberIds.size
      ? db.user.findMany({
          where: { id: { in: [...memberIds] } },
          select: { id: true, name: true },
        })
      : [],
    taskIds.size
      ? db.task.findMany({
          where: { id: { in: [...taskIds] }, circleId },
          select: { id: true, title: true },
        })
      : [],
    medicationIds.size
      ? db.medication.findMany({
          where: { id: { in: [...medicationIds] }, circleId },
          select: { id: true, name: true },
        })
      : [],
    visitIds.size
      ? db.visit.findMany({
          where: { id: { in: [...visitIds] }, circleId },
          select: { id: true, visitor: { select: { name: true } } },
        })
      : [],
  ]);
  const nameOf = new Map(people.map((person) => [person.id, person.name]));
  const titleOf = new Map(tasks.map((task) => [task.id, task.title]));
  const medicationOf = new Map(medications.map((item) => [item.id, item.name]));
  const visitorOf = new Map(
    visits.map((visit) => [visit.id, visit.visitor?.name ?? null]),
  );

  const entries: AccessLogEntry[] = pageRows.map((row) => {
    const deviceName = row.deviceName ?? row.device?.name ?? null;
    const event = eventOf(row, deviceName);
    const entityId = row.entityId ?? "";

    let subject: string | null = null;
    let subjectKind: SubjectKind | null = null;
    if (row.entity === "Membership") {
      subject = nameOf.get(entityId) ?? null;
      subjectKind = "person";
    } else if (TASK_ENTITIES.has(row.entity) && row.entityId) {
      subject = titleOf.get(entityId) ?? null;
      subjectKind = "task";
    } else if (MEDICATION_ENTITIES.has(row.entity) && row.entityId) {
      subject = medicationOf.get(entityId) ?? null;
      subjectKind = "medication";
    } else if (VISIT_ENTITIES.has(row.entity) && row.entityId) {
      subject = visitorOf.get(entityId) ?? null;
      subjectKind = "visit";
    } else if (event !== "seniorScreen" && deviceName) {
      subject = deviceName;
      subjectKind = "device";
    }

    // The senior's device opens the senior screen and confirms doses itself.
    const byDevice =
      !row.userId && (event === "seniorScreen" || event === "takeDose");

    return {
      id: row.id,
      createdAt: row.createdAt,
      event,
      actor: row.user?.name ?? (byDevice ? deviceName : null),
      subject,
      subjectKind,
    };
  });

  return { entries, hasMore };
}
