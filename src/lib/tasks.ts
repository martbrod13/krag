import type { Prisma } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import type { DbClient } from "@/lib/db";
import { db } from "@/lib/db";
import { dateToDay, dayToDate, isDay, isTime } from "@/lib/dates";

// The care plan: tasks ("buy the prescription") and events ("doctor at
// 10:00"), optionally on a day and at a time, in Polish time (data map,
// section 5). Anyone with the TASKS permission can add, take and finish
// tasks; the person who added a task or a coordinator can delete it.

export type TaskInput = {
  title: string;
  note: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  /** HH:MM, only together with a date */
  time: string | null;
  assigneeId: string | null;
  showToSenior: boolean;
};

type TaskFieldError = "titleRequired" | "dateInvalid" | "timeInvalid";
export type TaskError = TaskFieldError | "timeNeedsDate";

/** Checks the task form. Text is trimmed and shortened to safe lengths. */
export function parseTask(
  fields: Record<string, unknown>,
): { input: TaskInput } | { error: TaskError } {
  const text = (key: string, max: number) =>
    String(fields[key] ?? "")
      .trim()
      .slice(0, max);

  const title = text("title", 120).replace(/\s+/g, " ");
  const note = text("note", 500);
  const date = text("date", 10);
  const time = text("time", 5);
  const assigneeId = text("assigneeId", 64);

  if (!title) return { error: "titleRequired" };
  const year = Number(date.slice(0, 4));
  if (date && (!isDay(date) || year < 2000 || year > 2099)) {
    return { error: "dateInvalid" };
  }
  if (time && !isTime(time)) return { error: "timeInvalid" };
  if (time && !date) return { error: "timeNeedsDate" };

  return {
    input: {
      title,
      note: note || null,
      date: date || null,
      time: time || null,
      assigneeId: assigneeId || null,
      showToSenior: fields.showToSenior === "on",
    },
  };
}

export type TaskView = {
  id: string;
  title: string;
  note: string | null;
  date: string | null;
  time: string | null;
  showToSenior: boolean;
  assignee: { id: string; name: string } | null;
  createdById: string | null;
  done: boolean;
  doneBy: string | null;
};

const taskSelect = {
  id: true,
  title: true,
  note: true,
  date: true,
  time: true,
  showToSenior: true,
  createdById: true,
  doneAt: true,
  assignee: { select: { id: true, name: true } },
  doneBy: { select: { name: true } },
} satisfies Prisma.TaskSelect;

type TaskOrder = Prisma.TaskOrderByWithRelationInput;

/** By day and time; tasks without a day or time come last. */
const planOrder: TaskOrder[] = [
  { date: "asc" },
  { time: "asc" },
  { createdAt: "asc" },
];

async function findTasks(
  where: Prisma.TaskWhereInput,
  options: { orderBy?: TaskOrder[]; take?: number } = {},
): Promise<TaskView[]> {
  const tasks = await db.task.findMany({
    where,
    orderBy: options.orderBy ?? planOrder,
    take: options.take,
    select: taskSelect,
  });
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    note: task.note,
    date: task.date ? dateToDay(task.date) : null,
    time: task.time,
    showToSenior: task.showToSenior,
    assignee: task.assignee,
    createdById: task.createdById,
    done: task.doneAt !== null,
    doneBy: task.doneBy?.name ?? null,
  }));
}

export type DayPlan = { day: string; tasks: TaskView[] };

export type Plan = {
  /** Not done, with a day before today. */
  overdue: TaskView[];
  /** Everything on today, done or not. */
  today: TaskView[];
  /** Not done, on the following days, day by day. */
  upcoming: DayPlan[];
  /** Not done and without a day. */
  undated: TaskView[];
  /** Done recently, apart from today's. */
  done: TaskView[];
};

/** How many recently done tasks the plan shows. */
const RECENT_DONE = 20;

/** The circle's plan as seen on a given day (YYYY-MM-DD, Polish time). */
export async function getPlan(circleId: string, today: string): Promise<Plan> {
  const todayDate = dayToDate(today);
  const notToday: Prisma.TaskWhereInput = {
    OR: [{ date: null }, { date: { not: todayDate } }],
  };
  const [open, onToday, done] = await Promise.all([
    findTasks({ circleId, doneAt: null, ...notToday }),
    findTasks({ circleId, date: todayDate }),
    findTasks(
      { circleId, doneAt: { not: null }, ...notToday },
      { orderBy: [{ doneAt: "desc" }], take: RECENT_DONE },
    ),
  ]);

  const upcoming: DayPlan[] = [];
  for (const task of open) {
    if (!task.date || task.date < today) continue;
    const last = upcoming.at(-1);
    if (last?.day === task.date) last.tasks.push(task);
    else upcoming.push({ day: task.date, tasks: [task] });
  }

  return {
    overdue: open.filter((task) => task.date !== null && task.date < today),
    today: onToday,
    upcoming,
    undated: open.filter((task) => task.date === null),
    done,
  };
}

/** Today's tasks the family chose to show on the senior screen. */
export async function getSeniorPlan(circleId: string, today: string) {
  return findTasks({ circleId, date: dayToDate(today), showToSenior: true });
}

/** One task of the circle, or null. */
export async function getTask(circleId: string, taskId: string) {
  const [task] = await findTasks({ id: taskId, circleId });
  return task ?? null;
}

/** People who can take tasks: everyone in the circle who sees them. */
export async function listTaskPeople(circleId: string) {
  const memberships = await db.membership.findMany({
    where: { circleId, permissions: { has: "TASKS" } },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { id: true, name: true } } },
  });
  return memberships.map((membership) => membership.user);
}

/** The chosen person, if they are in the circle and see tasks; else nobody. */
async function validAssignee(
  tx: DbClient,
  circleId: string,
  assigneeId: string | null,
) {
  if (!assigneeId) return null;
  const member = await tx.membership.findUnique({
    where: { circleId_userId: { circleId, userId: assigneeId } },
    select: { permissions: true },
  });
  return member?.permissions.includes("TASKS") ? assigneeId : null;
}

async function taskData(tx: DbClient, circleId: string, input: TaskInput) {
  return {
    title: input.title,
    note: input.note,
    date: input.date ? dayToDate(input.date) : null,
    time: input.date ? input.time : null,
    assigneeId: await validAssignee(tx, circleId, input.assigneeId),
    showToSenior: input.showToSenior,
  };
}

/**
 * Adds a task and returns its id. The caller must check that the user sees
 * the circle's tasks.
 */
export async function createTask(params: {
  circleId: string;
  userId: string;
  input: TaskInput;
}) {
  const { circleId, userId, input } = params;
  return db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        circleId,
        createdById: userId,
        ...(await taskData(tx, circleId, input)),
      },
      select: { id: true },
    });
    await logAccess(
      {
        circleId,
        userId,
        action: "CREATE",
        entity: "Task",
        entityId: task.id,
      },
      tx,
    );
    return task.id;
  });
}

/** Changes a task. Returns false if the circle has no such task. */
export async function updateTask(params: {
  circleId: string;
  taskId: string;
  userId: string;
  input: TaskInput;
}) {
  const { circleId, taskId, userId, input } = params;
  return db.$transaction(async (tx) => {
    const data = await taskData(tx, circleId, input);
    const updated = await tx.task.updateMany({
      where: { id: taskId, circleId },
      data,
    });
    if (updated.count === 0) return false;
    await logAccess(
      { circleId, userId, action: "UPDATE", entity: "Task", entityId: taskId },
      tx,
    );
    return true;
  });
}

export type ClaimResult = "claimed" | "taken" | "notFound";

/** "I'll take it": the user takes a task nobody has taken yet. */
export async function claimTask(params: {
  circleId: string;
  taskId: string;
  userId: string;
}): Promise<ClaimResult> {
  const { circleId, taskId, userId } = params;
  return db.$transaction(async (tx) => {
    const claimed = await tx.task.updateMany({
      where: { id: taskId, circleId, assigneeId: null },
      data: { assigneeId: userId },
    });
    if (claimed.count === 0) {
      const exists = await tx.task.count({ where: { id: taskId, circleId } });
      return exists > 0 ? "taken" : "notFound";
    }
    await logAccess(
      {
        circleId,
        userId,
        action: "UPDATE",
        entity: "TaskAssignee",
        entityId: taskId,
      },
      tx,
    );
    return "claimed";
  });
}

/** Marks a task as done, or not done again. False if nothing changed. */
export async function setTaskDone(params: {
  circleId: string;
  taskId: string;
  userId: string;
  done: boolean;
}) {
  const { circleId, taskId, userId, done } = params;
  return db.$transaction(async (tx) => {
    const changed = await tx.task.updateMany({
      where: { id: taskId, circleId, doneAt: done ? null : { not: null } },
      data: done
        ? { doneAt: new Date(), doneById: userId }
        : { doneAt: null, doneById: null },
    });
    if (changed.count === 0) return false;
    await logAccess(
      {
        circleId,
        userId,
        action: done ? "CREATE" : "DELETE",
        entity: "TaskDone",
        entityId: taskId,
      },
      tx,
    );
    return true;
  });
}

export type DeleteTaskResult = "deleted" | "notFound" | "notAllowed";

/** Deletes a task: only the person who added it or a coordinator may. */
export async function deleteTask(params: {
  circleId: string;
  taskId: string;
  userId: string;
}): Promise<DeleteTaskResult> {
  const { circleId, taskId, userId } = params;
  return db.$transaction(async (tx) => {
    const task = await tx.task.findFirst({
      where: { id: taskId, circleId },
      select: { createdById: true },
    });
    if (!task) return "notFound";
    if (task.createdById !== userId) {
      const member = await tx.membership.findUnique({
        where: { circleId_userId: { circleId, userId } },
        select: { role: true },
      });
      if (member?.role !== "COORDINATOR") return "notAllowed";
    }

    await tx.task.delete({ where: { id: taskId } });
    await logAccess(
      { circleId, userId, action: "DELETE", entity: "Task", entityId: taskId },
      tx,
    );
    return "deleted";
  });
}

export type OpenTaskCounts = { today: number; overdue: number };

/**
 * How many tasks are still to do today, and how many are late, per circle:
 * the short summary on the circle cards.
 */
export async function countOpenTasks(
  circleIds: string[],
  today: string,
): Promise<Map<string, OpenTaskCounts>> {
  const counts = new Map<string, OpenTaskCounts>(
    circleIds.map((id) => [id, { today: 0, overdue: 0 }]),
  );
  if (circleIds.length === 0) return counts;

  const todayDate = dayToDate(today);
  const open = { circleId: { in: circleIds }, doneAt: null };
  const [onToday, late] = await Promise.all([
    db.task.groupBy({
      by: ["circleId"],
      where: { ...open, date: todayDate },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ["circleId"],
      where: { ...open, date: { lt: todayDate } },
      _count: { _all: true },
    }),
  ]);
  for (const row of onToday) {
    const entry = counts.get(row.circleId);
    if (entry) entry.today = row._count._all;
  }
  for (const row of late) {
    const entry = counts.get(row.circleId);
    if (entry) entry.overdue = row._count._all;
  }
  return counts;
}
