import { type AccessLogEntry, getAccessLog } from "@/lib/access-log";
import { logAccess } from "@/lib/audit";
import { dateToDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { VISIT_ACTIVITIES } from "@/lib/visits";

// "Download my data" (data map, users' rights; GDPR art. 15 and 20). A
// person gets their own data; a coordinator gets everything in their
// circle. Files are made when downloaded and never stored on the server.
// Dates are YYYY-MM-DD in Polish time, times HH:MM, moments ISO 8601.

/** Changes when the shape of the files changes. */
export const EXPORT_VERSION = 1;

const dayOf = (date: Date | null) => (date ? dateToDay(date) : null);

const nameOf = (person: { name: string } | null) => person?.name ?? null;

/** Activities in their usual order, unknown ones left out. */
const activitiesOf = (activities: string[]) =>
  VISIT_ACTIVITIES.filter((activity) => activities.includes(activity));

/** A file name part from a circle's name: "Mama Halina" → "mama-halina". */
export function fileSlug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** The whole access log of a circle (12 months), newest first. */
async function wholeAccessLog(circleId: string) {
  const entries: AccessLogEntry[] = [];
  for (let page = 1; ; page++) {
    const result = await getAccessLog(circleId, page);
    entries.push(...result.entries);
    if (!result.hasMore) return entries;
  }
}

/**
 * Everything in a circle, for its coordinator: the caller must check
 * MANAGE. The download is written into the access log.
 */
export async function exportCircle(circleId: string, userId: string) {
  const circle = await db.careCircle.findUnique({
    where: { id: circleId },
    select: {
      name: true,
      createdAt: true,
      recipient: {
        select: {
          firstName: true,
          birthDate: true,
          city: true,
          address: true,
          primaryDoctor: true,
          emergencyContacts: {
            orderBy: { position: "asc" },
            select: { name: true, phone: true, relationship: true },
          },
        },
      },
      memberships: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          permissions: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
      invitations: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "asc" },
        select: { role: true, createdAt: true, expiresAt: true },
      },
      devices: {
        orderBy: { pairedAt: "asc" },
        select: { name: true, pairedAt: true, lastUsedAt: true },
      },
      tasks: {
        orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
        select: {
          title: true,
          note: true,
          date: true,
          time: true,
          showToSenior: true,
          createdAt: true,
          doneAt: true,
          createdBy: { select: { name: true } },
          assignee: { select: { name: true } },
          doneBy: { select: { name: true } },
        },
      },
      medications: {
        orderBy: [{ name: "asc" }, { createdAt: "asc" }],
        select: {
          name: true,
          note: true,
          weekdays: true,
          startDate: true,
          endDate: true,
          showToSenior: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { name: true } },
          times: {
            orderBy: { time: "asc" },
            select: { time: true, amount: true },
          },
          intakes: {
            orderBy: [{ date: "asc" }, { time: "asc" }],
            select: {
              date: true,
              time: true,
              takenAt: true,
              bySenior: true,
              confirmedBy: { select: { name: true } },
            },
          },
        },
      },
      visits: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        select: {
          date: true,
          startTime: true,
          endTime: true,
          plan: true,
          actualStart: true,
          actualEnd: true,
          activities: true,
          report: true,
          reportedAt: true,
          createdAt: true,
          visitor: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
      },
    },
  });
  if (!circle) return null;

  const accessLog = await wholeAccessLog(circleId);
  await logAccess({
    circleId,
    userId,
    action: "VIEW",
    entity: "CircleExport",
  });

  const recipient = circle.recipient;
  return {
    format: "krag-circle",
    version: EXPORT_VERSION,
    exportedAt: new Date(),
    circle: { name: circle.name, createdAt: circle.createdAt },
    careRecipient: recipient
      ? {
          firstName: recipient.firstName,
          birthDate: dayOf(recipient.birthDate),
          city: recipient.city,
          address: recipient.address,
          primaryDoctor: recipient.primaryDoctor,
        }
      : null,
    emergencyContacts: recipient?.emergencyContacts ?? [],
    members: circle.memberships.map((membership) => ({
      name: membership.user.name,
      role: membership.role,
      permissions: membership.permissions,
      since: membership.createdAt,
    })),
    invitations: circle.invitations,
    devices: circle.devices,
    tasks: circle.tasks.map((task) => ({
      title: task.title,
      note: task.note,
      date: dayOf(task.date),
      time: task.time,
      showToSenior: task.showToSenior,
      addedBy: nameOf(task.createdBy),
      addedAt: task.createdAt,
      assignee: nameOf(task.assignee),
      doneAt: task.doneAt,
      doneBy: nameOf(task.doneBy),
    })),
    medications: circle.medications.map((medication) => ({
      name: medication.name,
      note: medication.note,
      times: medication.times,
      weekdays: medication.weekdays,
      firstDay: dayOf(medication.startDate),
      lastDay: dayOf(medication.endDate),
      showToSenior: medication.showToSenior,
      addedBy: nameOf(medication.createdBy),
      addedAt: medication.createdAt,
      changedAt: medication.updatedAt,
      doses: medication.intakes.map((intake) => ({
        date: dayOf(intake.date),
        time: intake.time,
        takenAt: intake.takenAt,
        confirmedBy: nameOf(intake.confirmedBy),
        bySenior: intake.bySenior,
      })),
    })),
    visits: circle.visits.map((visit) => ({
      date: dayOf(visit.date),
      startTime: visit.startTime,
      endTime: visit.endTime,
      visitor: nameOf(visit.visitor),
      plan: visit.plan,
      actualStart: visit.actualStart,
      actualEnd: visit.actualEnd,
      activities: activitiesOf(visit.activities),
      report: visit.report,
      reportedAt: visit.reportedAt,
      plannedBy: nameOf(visit.createdBy),
      plannedAt: visit.createdAt,
    })),
    accessLog: accessLog.map((entry) => ({
      at: entry.createdAt,
      event: entry.event,
      who: entry.actor,
      about: entry.subject,
    })),
  };
}

export type CircleExport = NonNullable<
  Awaited<ReturnType<typeof exportCircle>>
>;

/**
 * A person's own data: the account, recent sign-ins, their circles with
 * role and permissions, and their own tasks and visits from the circles in
 * which they see tasks and visits.
 */
export async function exportAccount(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      locale: true,
      createdAt: true,
      sessions: {
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          expiresAt: true,
          ipAddress: true,
          userAgent: true,
        },
      },
      memberships: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          permissions: true,
          createdAt: true,
          circle: { select: { id: true, name: true } },
          invitedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!user) return null;

  const circles = await Promise.all(
    user.memberships.map(async (membership) => {
      const circleId = membership.circle.id;
      const [tasks, visits] = await Promise.all([
        membership.permissions.includes("TASKS")
          ? db.task.findMany({
              where: {
                circleId,
                OR: [
                  { createdById: userId },
                  { assigneeId: userId },
                  { doneById: userId },
                ],
              },
              orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
              select: {
                title: true,
                date: true,
                time: true,
                createdAt: true,
                doneAt: true,
                createdById: true,
                assigneeId: true,
                doneById: true,
              },
            })
          : [],
        membership.permissions.includes("VISITS")
          ? db.visit.findMany({
              where: { circleId, visitorId: userId },
              orderBy: [{ date: "asc" }, { startTime: "asc" }],
              select: {
                date: true,
                startTime: true,
                endTime: true,
                plan: true,
                actualStart: true,
                actualEnd: true,
                activities: true,
                report: true,
                reportedAt: true,
              },
            })
          : [],
      ]);

      return {
        name: membership.circle.name,
        role: membership.role,
        permissions: membership.permissions,
        memberSince: membership.createdAt,
        invitedBy: nameOf(membership.invitedBy),
        tasks: tasks.map((task) => ({
          title: task.title,
          date: dayOf(task.date),
          time: task.time,
          addedAt: task.createdAt,
          addedByMe: task.createdById === userId,
          takenByMe: task.assigneeId === userId,
          doneAt: task.doneAt,
          doneByMe: task.doneById === userId,
        })),
        visits: visits.map((visit) => ({
          date: dayOf(visit.date),
          startTime: visit.startTime,
          endTime: visit.endTime,
          plan: visit.plan,
          actualStart: visit.actualStart,
          actualEnd: visit.actualEnd,
          activities: activitiesOf(visit.activities),
          report: visit.report,
          reportedAt: visit.reportedAt,
        })),
      };
    }),
  );

  return {
    format: "krag-account",
    version: EXPORT_VERSION,
    exportedAt: new Date(),
    account: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      language: user.locale,
      createdAt: user.createdAt,
    },
    signIns: user.sessions,
    circles,
  };
}
