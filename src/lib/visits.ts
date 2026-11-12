import type { CircleRole, Prisma } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import {
  addDays,
  dateToDay,
  dayToDate,
  isDay,
  isTime,
  weekdayOf,
} from "@/lib/dates";
import type { DbClient } from "@/lib/db";
import { db } from "@/lib/db";

// Visits to the care recipient and their reports (data map, section 6).
// People with VISITS see visits; a professional caregiver sees only their
// own (data map, decision 2). Family plans visits and a caregiver can plan
// their own. Only the person who comes starts a visit and writes the
// report; the person who planned it or a coordinator deletes it. Days and
// times are Polish time. No location is ever stored.

/** What can be ticked in a report, in this order. */
export const VISIT_ACTIVITIES = [
  "meal",
  "meds",
  "hygiene",
  "walk",
  "shopping",
  "cleaning",
] as const;

export type VisitActivity = (typeof VISIT_ACTIVITIES)[number];

/** For how many weeks a new visit can repeat on chosen days. */
export const REPEAT_WEEKS = [2, 4, 8];

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/** Who looks at visits: caregivers see only the visits they come to. */
export type VisitViewer = { userId: string; role: CircleRole };

function visibleTo(viewer: VisitViewer | null): Prisma.VisitWhereInput {
  return viewer?.role === "CAREGIVER" ? { visitorId: viewer.userId } : {};
}

/** The user as a viewer of the circle's visits, if they may see them. */
export async function getVisitViewer(
  circleId: string,
  userId: string,
): Promise<VisitViewer | null> {
  const member = await db.membership.findUnique({
    where: { circleId_userId: { circleId, userId } },
    select: { role: true, permissions: true },
  });
  return member?.permissions.includes("VISITS")
    ? { userId, role: member.role }
    : null;
}

export type VisitInput = {
  /** One day, or every day of a weekly repeat. */
  days: string[];
  /** HH:MM */
  startTime: string;
  endTime: string | null;
  visitorId: string | null;
  plan: string | null;
};

type WhenError = "dateInvalid" | "startRequired" | "timeInvalid";
export type VisitError = WhenError | "visitorRequired";

function validDay(day: string) {
  const year = Number(day.slice(0, 4));
  return isDay(day) && year >= 2000 && year <= 2099;
}

function texts(fields: Record<string, unknown>) {
  return (key: string, max: number) =>
    String(fields[key] ?? "")
      .trim()
      .slice(0, max);
}

/**
 * Checks the visit form. With a weekly repeat the visit is planned on the
 * chosen days of the week (or the first day's) for the chosen weeks.
 */
export function parseVisit(
  fields: Record<string, unknown>,
): { input: VisitInput } | { error: VisitError } {
  const text = texts(fields);
  const date = text("date", 10);
  const startTime = text("startTime", 5);
  const endTime = text("endTime", 5);

  if (!validDay(date)) return { error: "dateInvalid" };
  if (!startTime) return { error: "startRequired" };
  if (!isTime(startTime) || (endTime && !isTime(endTime))) {
    return { error: "timeInvalid" };
  }

  let days = [date];
  const weeks = Number(text("repeatWeeks", 2));
  if (REPEAT_WEEKS.includes(weeks)) {
    const chosen = WEEKDAYS.filter((day) => fields[`weekday${day}`] === "on");
    const weekdays = chosen.length > 0 ? chosen : [weekdayOf(date)];
    days = [];
    for (let offset = 0; offset < weeks * 7; offset++) {
      const day = addDays(date, offset);
      if (weekdays.includes(weekdayOf(day))) days.push(day);
    }
  }

  return {
    input: {
      days,
      startTime,
      endTime: endTime || null,
      visitorId: text("visitorId", 64) || null,
      plan: text("plan", 500) || null,
    },
  };
}

export type ReportInput = {
  actualStart: string;
  actualEnd: string;
  activities: VisitActivity[];
  report: string | null;
};

/** Checks the report form: both times, what was done and a description. */
export function parseReport(
  fields: Record<string, unknown>,
): { input: ReportInput } | { error: "timeInvalid" } {
  const text = texts(fields);
  const actualStart = text("actualStart", 5);
  const actualEnd = text("actualEnd", 5);
  if (!isTime(actualStart) || !isTime(actualEnd)) {
    return { error: "timeInvalid" };
  }
  return {
    input: {
      actualStart,
      actualEnd,
      activities: VISIT_ACTIVITIES.filter(
        (activity) => fields[`activity-${activity}`] === "on",
      ),
      report: text("report", 2000) || null,
    },
  };
}

export type VisitView = {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  plan: string | null;
  /** The person who comes; null after they left the circle. */
  visitor: { id: string; name: string } | null;
  actualStart: string | null;
  actualEnd: string | null;
  activities: VisitActivity[];
  report: string | null;
  reportedAt: Date | null;
  createdById: string | null;
};

const visitSelect = {
  id: true,
  date: true,
  startTime: true,
  endTime: true,
  plan: true,
  actualStart: true,
  actualEnd: true,
  activities: true,
  report: true,
  reportedAt: true,
  createdById: true,
  visitor: { select: { id: true, name: true } },
} satisfies Prisma.VisitSelect;

type VisitOrder = Prisma.VisitOrderByWithRelationInput;

const byTime: VisitOrder[] = [{ date: "asc" }, { startTime: "asc" }];

async function findVisits(
  where: Prisma.VisitWhereInput,
  options: { orderBy?: VisitOrder[]; take?: number } = {},
): Promise<VisitView[]> {
  const visits = await db.visit.findMany({
    where,
    orderBy: options.orderBy ?? byTime,
    take: options.take,
    select: visitSelect,
  });
  return visits.map((visit) => ({
    ...visit,
    date: dateToDay(visit.date),
    activities: VISIT_ACTIVITIES.filter((activity) =>
      visit.activities.includes(activity),
    ),
  }));
}

/** Started and not ended yet. */
export function isInProgress(visit: VisitView) {
  return visit.actualStart !== null && visit.actualEnd === null;
}

/** A visit of a past day nobody started or reported. */
export function isMissedVisit(visit: VisitView, today: string) {
  return visit.date < today && visit.actualStart === null;
}

export type DayVisits = { day: string; visits: VisitView[] };

export type VisitsPage = {
  inProgress: VisitView[];
  today: VisitView[];
  /** The next days, day by day. */
  upcoming: DayVisits[];
  /** Earlier visits, newest first. */
  past: VisitView[];
};

/** How many upcoming and past visits the visits page shows. */
const UPCOMING_LIMIT = 60;
const PAST_LIMIT = 20;

/** The circle's visits as the viewer sees them on a day. */
export async function getVisitsPage(
  circleId: string,
  viewer: VisitViewer,
  today: string,
): Promise<VisitsPage> {
  const base = { circleId, ...visibleTo(viewer) };
  const todayDate = dayToDate(today);
  const [inProgress, onToday, later, earlier] = await Promise.all([
    findVisits({
      ...base,
      actualStart: { not: null },
      actualEnd: null,
      date: { lte: todayDate },
    }),
    findVisits({ ...base, date: todayDate }),
    findVisits({ ...base, date: { gt: todayDate } }, { take: UPCOMING_LIMIT }),
    findVisits(
      { ...base, date: { lt: todayDate } },
      {
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: PAST_LIMIT,
      },
    ),
  ]);

  const running = new Set(inProgress.map((visit) => visit.id));
  const upcoming: DayVisits[] = [];
  for (const visit of later) {
    const last = upcoming.at(-1);
    if (last?.day === visit.date) last.visits.push(visit);
    else upcoming.push({ day: visit.date, visits: [visit] });
  }
  return {
    inProgress,
    today: onToday.filter((visit) => !running.has(visit.id)),
    upcoming,
    past: earlier.filter((visit) => !running.has(visit.id)),
  };
}

/** Today's visits; without a viewer all of them (the senior screen). */
export async function getTodayVisits(
  circleId: string,
  today: string,
  viewer: VisitViewer | null = null,
) {
  return findVisits({
    circleId,
    date: dayToDate(today),
    ...visibleTo(viewer),
  });
}

/** The newest visit with a report the viewer may see, or null. */
export async function getLatestReport(circleId: string, viewer: VisitViewer) {
  const [visit] = await findVisits(
    { circleId, reportedAt: { not: null }, ...visibleTo(viewer) },
    { orderBy: [{ date: "desc" }, { startTime: "desc" }], take: 1 },
  );
  return visit ?? null;
}

/** One visit of the circle the viewer may see, or null. */
export async function getVisit(
  circleId: string,
  visitId: string,
  viewer: VisitViewer,
) {
  const [visit] = await findVisits({
    id: visitId,
    circleId,
    ...visibleTo(viewer),
  });
  return visit ?? null;
}

/** Who can come on a visit: people with VISITS, caregivers first. */
export async function listVisitPeople(circleId: string) {
  const memberships = await db.membership.findMany({
    where: { circleId, permissions: { has: "VISITS" } },
    orderBy: { createdAt: "asc" },
    select: { role: true, user: { select: { id: true, name: true } } },
  });
  const caregiversFirst = [
    ...memberships.filter((membership) => membership.role === "CAREGIVER"),
    ...memberships.filter((membership) => membership.role !== "CAREGIVER"),
  ];
  return caregiversFirst.map((membership) => membership.user);
}

/** The chosen person, if they are in the circle and see visits. */
async function validVisitor(
  tx: DbClient,
  circleId: string,
  visitorId: string | null,
) {
  if (!visitorId) return null;
  const member = await tx.membership.findUnique({
    where: { circleId_userId: { circleId, userId: visitorId } },
    select: { permissions: true },
  });
  return member?.permissions.includes("VISITS") ? visitorId : null;
}

/** A caregiver plans visits only for themselves. */
function visitorOf(viewer: VisitViewer, input: VisitInput) {
  return viewer.role === "CAREGIVER" ? viewer.userId : input.visitorId;
}

/**
 * Plans a visit, or a visit on every day of a weekly repeat. The caller
 * must check that the user may see the circle's visits.
 */
export async function createVisits(params: {
  circleId: string;
  viewer: VisitViewer;
  input: VisitInput;
}): Promise<{ ids: string[] } | { error: "visitorRequired" }> {
  const { circleId, viewer, input } = params;
  return db.$transaction(async (tx) => {
    const visitorId = await validVisitor(
      tx,
      circleId,
      visitorOf(viewer, input),
    );
    if (!visitorId) return { error: "visitorRequired" as const };

    const ids: string[] = [];
    for (const day of input.days) {
      const visit = await tx.visit.create({
        data: {
          circleId,
          visitorId,
          date: dayToDate(day),
          startTime: input.startTime,
          endTime: input.endTime,
          plan: input.plan,
          activities: [],
          createdById: viewer.userId,
        },
        select: { id: true },
      });
      ids.push(visit.id);
    }
    // One entry for the whole repeat keeps the log readable.
    await logAccess(
      {
        circleId,
        userId: viewer.userId,
        action: "CREATE",
        entity: "Visit",
        entityId: ids[0],
      },
      tx,
    );
    return { ids };
  });
}

export type UpdateVisitResult = "saved" | "notFound" | "visitorRequired";

/** Changes the day, times, person and plan of one visit. */
export async function updateVisit(params: {
  circleId: string;
  visitId: string;
  viewer: VisitViewer;
  input: VisitInput;
}): Promise<UpdateVisitResult> {
  const { circleId, visitId, viewer, input } = params;
  return db.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id: visitId, circleId, ...visibleTo(viewer) },
      select: { visitorId: true },
    });
    if (!visit) return "notFound";
    const visitorId =
      viewer.role === "CAREGIVER"
        ? visit.visitorId
        : await validVisitor(tx, circleId, input.visitorId);
    if (!visitorId) return "visitorRequired";

    await tx.visit.update({
      where: { id: visitId },
      data: {
        visitorId,
        date: dayToDate(input.days[0]),
        startTime: input.startTime,
        endTime: input.endTime,
        plan: input.plan,
      },
    });
    await logAccess(
      {
        circleId,
        userId: viewer.userId,
        action: "UPDATE",
        entity: "Visit",
        entityId: visitId,
      },
      tx,
    );
    return "saved";
  });
}

type StartRefusal = "already" | "notToday" | "notYours" | "notFound";
export type StartVisitResult = "started" | StartRefusal;

/** "I'm starting the visit": the person who comes, on the day of the visit. */
export async function startVisit(params: {
  circleId: string;
  visitId: string;
  userId: string;
  today: string;
  /** The time now, HH:MM. */
  now: string;
}): Promise<StartVisitResult> {
  const { circleId, visitId, userId, today, now } = params;
  return db.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id: visitId, circleId },
      select: { visitorId: true, date: true, actualStart: true },
    });
    if (!visit) return "notFound";
    if (visit.visitorId !== userId) return "notYours";
    if (visit.actualStart) return "already";
    if (dateToDay(visit.date) !== today) return "notToday";

    await tx.visit.update({
      where: { id: visitId },
      data: { actualStart: now },
    });
    await logAccess(
      {
        circleId,
        userId,
        action: "UPDATE",
        entity: "VisitStart",
        entityId: visitId,
      },
      tx,
    );
    return "started";
  });
}

export type SaveReportResult = "saved" | "notYet" | "notYours" | "notFound";

/**
 * Saves the report of a visit with its real times; this also ends a visit
 * in progress. Only the person who came, from the day of the visit.
 */
export async function saveReport(params: {
  circleId: string;
  visitId: string;
  userId: string;
  today: string;
  input: ReportInput;
}): Promise<SaveReportResult> {
  const { circleId, visitId, userId, today, input } = params;
  return db.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id: visitId, circleId },
      select: { visitorId: true, date: true },
    });
    if (!visit) return "notFound";
    if (visit.visitorId !== userId) return "notYours";
    if (dateToDay(visit.date) > today) return "notYet";

    await tx.visit.update({
      where: { id: visitId },
      data: { ...input, reportedAt: new Date() },
    });
    await logAccess(
      {
        circleId,
        userId,
        action: "UPDATE",
        entity: "VisitReport",
        entityId: visitId,
      },
      tx,
    );
    return "saved";
  });
}

export type DeleteVisitResult = "deleted" | "notFound" | "notAllowed";

/**
 * Deletes a visit with its report: only the person who planned it or a
 * coordinator may.
 */
export async function deleteVisit(params: {
  circleId: string;
  visitId: string;
  userId: string;
}): Promise<DeleteVisitResult> {
  const { circleId, visitId, userId } = params;
  return db.$transaction(async (tx) => {
    const visit = await tx.visit.findFirst({
      where: { id: visitId, circleId },
      select: { createdById: true },
    });
    if (!visit) return "notFound";
    if (visit.createdById !== userId) {
      const member = await tx.membership.findUnique({
        where: { circleId_userId: { circleId, userId } },
        select: { role: true },
      });
      if (member?.role !== "COORDINATOR") return "notAllowed";
    }

    await tx.visit.delete({ where: { id: visitId } });
    await logAccess(
      {
        circleId,
        userId,
        action: "DELETE",
        entity: "Visit",
        entityId: visitId,
      },
      tx,
    );
    return "deleted";
  });
}

/** Today's next visit on a start page card: one in progress, or the next planned. */
export type VisitSummary = {
  startTime: string;
  endTime: string | null;
  actualStart: string | null;
  visitor: string | null;
};

/**
 * For each circle, the visit of the day that matters now: the one in
 * progress or the next not started. Caregivers count only their own.
 */
export async function summarizeVisits(
  memberships: { circleId: string; role: CircleRole }[],
  userId: string,
  today: string,
): Promise<Map<string, VisitSummary>> {
  const summaries = new Map<string, VisitSummary>();
  if (memberships.length === 0) return summaries;

  const roleOf = new Map(
    memberships.map((membership) => [membership.circleId, membership.role]),
  );
  const visits = await db.visit.findMany({
    where: {
      circleId: { in: [...roleOf.keys()] },
      date: dayToDate(today),
      actualEnd: null,
      visitorId: { not: null },
    },
    orderBy: { startTime: "asc" },
    select: {
      circleId: true,
      visitorId: true,
      startTime: true,
      endTime: true,
      actualStart: true,
      visitor: { select: { name: true } },
    },
  });

  for (const visit of visits) {
    const own = visit.visitorId === userId;
    if (roleOf.get(visit.circleId) === "CAREGIVER" && !own) continue;
    const current = summaries.get(visit.circleId);
    // A visit in progress wins over one that has not started.
    if (current && (current.actualStart || !visit.actualStart)) continue;
    summaries.set(visit.circleId, {
      startTime: visit.startTime,
      endTime: visit.endTime,
      actualStart: visit.actualStart,
      visitor: visit.visitor?.name ?? null,
    });
  }
  return summaries;
}
