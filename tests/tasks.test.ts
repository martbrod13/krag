// Tests of the care plan against a real database: adding tasks, "I'll take
// it", done, the day plan, the summary on the start page, the senior screen
// and the access log.
// Like the other tests, they create and remove their own made-up people.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { getAccessLog } from "@/lib/access-log";
import { createCircle, getMyCircles } from "@/lib/circles";
import { addDays, todayInPoland } from "@/lib/dates";
import { db } from "@/lib/db";
import { acceptInvitation, createInvitation } from "@/lib/invitations";
import { removeMember, updateMember } from "@/lib/members";
import {
  type TaskInput,
  claimTask,
  countOpenTasks,
  createTask,
  deleteTask,
  getPlan,
  getSeniorPlan,
  getTask,
  listTaskPeople,
  parseTask,
  setTaskDone,
  updateTask,
} from "@/lib/tasks";

const run = randomUUID().slice(0, 8);
const emails = ["ania", "tomek", "ewa", "obcy"].map(
  (name) => `${name}.plan.${run}@example.com`,
);
let aniaId = ""; // coordinator
let tomekId = ""; // family
let ewaId = ""; // caregiver
let outsiderId = ""; // not in the circle
let circleId = "";

// A fixed day keeps the tests the same whenever they run.
const today = "2026-11-11";

function task(title: string, extra: Partial<TaskInput> = {}): TaskInput {
  return {
    title,
    note: null,
    date: null,
    time: null,
    assigneeId: null,
    showToSenior: false,
    ...extra,
  };
}

before(async () => {
  const [ania, tomek, ewa, outsider] = await Promise.all(
    emails.map((email, index) =>
      db.user.create({
        data: { email, name: ["Ania", "Tomek", "Ewa", "Obcy"][index] },
      }),
    ),
  );
  aniaId = ania.id;
  tomekId = tomek.id;
  ewaId = ewa.id;
  outsiderId = outsider.id;

  circleId = (
    await createCircle(aniaId, {
      name: `Plan ${run}`,
      firstName: "Halina",
      birthDate: null,
      city: null,
    })
  ).id;
  for (const [userId, role] of [
    [tomekId, "FAMILY"],
    [ewaId, "CAREGIVER"],
  ] as const) {
    const { token } = await createInvitation({
      circleId,
      invitedById: aniaId,
      role,
    });
    await acceptInvitation(token, userId);
  }
});

after(async () => {
  await db.careCircle.deleteMany({ where: { id: circleId } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("days in Poland", () => {
  test("a new day starts at midnight Polish time", () => {
    assert.equal(todayInPoland(new Date("2026-12-31T22:59:00Z")), "2026-12-31");
    assert.equal(todayInPoland(new Date("2026-12-31T23:00:00Z")), "2027-01-01");
    assert.equal(todayInPoland(new Date("2026-06-30T22:00:00Z")), "2026-07-01");
    assert.equal(addDays("2026-02-28", 1), "2026-03-01");
  });
});

describe("the task form", () => {
  test("trims text and understands the checkbox", () => {
    assert.deepEqual(
      parseTask({
        title: "  Wykupić   receptę ",
        date: "2026-11-12",
        time: "09:30",
        note: " przed 12 ",
        showToSenior: "on",
      }),
      {
        input: {
          title: "Wykupić receptę",
          note: "przed 12",
          date: "2026-11-12",
          time: "09:30",
          assigneeId: null,
          showToSenior: true,
        },
      },
    );
  });

  test("needs a title, real days and times, and a day for a time", () => {
    const cases: [Record<string, string>, string][] = [
      [{ title: " " }, "titleRequired"],
      [{ title: "A", date: "2026-02-30" }, "dateInvalid"],
      [{ title: "A", date: "1999-12-31" }, "dateInvalid"],
      [{ title: "A", date: "2026-11-12", time: "25:00" }, "timeInvalid"],
      [{ title: "A", time: "10:00" }, "timeNeedsDate"],
    ];
    for (const [fields, error] of cases) {
      assert.deepEqual(parseTask(fields), { error }, JSON.stringify(fields));
    }
  });
});

describe("tasks", () => {
  let doctorId = "";
  let shoppingId = "";

  test("anyone who sees tasks can be chosen, nobody from outside", async () => {
    const people = await listTaskPeople(circleId);
    assert.deepEqual(
      people.map((person) => person.name),
      ["Ania", "Tomek", "Ewa"],
    );

    doctorId = await createTask({
      circleId,
      userId: aniaId,
      input: task("Wizyta u lekarza", {
        date: addDays(today, 1),
        time: "10:00",
        assigneeId: outsiderId,
        showToSenior: true,
      }),
    });
    const doctor = await getTask(circleId, doctorId);
    assert.equal(doctor?.assignee, null, "an outsider cannot take a task");
    assert.equal(doctor?.date, addDays(today, 1));
    assert.equal(doctor?.time, "10:00");
  });

  test("“I'll take it” works for the first person only", async () => {
    shoppingId = await createTask({
      circleId,
      userId: tomekId,
      input: task("Kupić żarówki"),
    });
    assert.equal(
      await claimTask({ circleId, taskId: shoppingId, userId: ewaId }),
      "claimed",
    );
    assert.equal(
      await claimTask({ circleId, taskId: shoppingId, userId: tomekId }),
      "taken",
    );
    assert.equal((await getTask(circleId, shoppingId))?.assignee?.name, "Ewa");
    assert.equal(
      await claimTask({ circleId, taskId: "nie-ma", userId: tomekId }),
      "notFound",
    );
  });

  test("the plan shows what is late, today, later and without a day", async () => {
    const lateId = await createTask({
      circleId,
      userId: aniaId,
      input: task("Zapłacić rachunek", { date: addDays(today, -2) }),
    });
    const walkId = await createTask({
      circleId,
      userId: aniaId,
      input: task("Spacer", { date: today, time: "16:00", showToSenior: true }),
    });
    const pillsId = await createTask({
      circleId,
      userId: aniaId,
      input: task("Odebrać recepty", { date: today, time: "09:00" }),
    });

    const plan = await getPlan(circleId, today);
    assert.deepEqual(
      plan.overdue.map((item) => item.id),
      [lateId],
    );
    assert.deepEqual(
      plan.today.map((item) => item.id),
      [pillsId, walkId],
      "today's tasks by time",
    );
    assert.deepEqual(
      plan.upcoming.map((day) => [day.day, day.tasks.map((item) => item.id)]),
      [[addDays(today, 1), [doctorId]]],
    );
    assert.deepEqual(
      plan.undated.map((item) => item.id),
      [shoppingId],
    );
  });

  test("done tasks leave the lists, but today's stay with a tick", async () => {
    const plan = await getPlan(circleId, today);
    const walk = plan.today.find((item) => item.title === "Spacer");
    assert.ok(walk);

    assert.equal(
      await setTaskDone({
        circleId,
        taskId: walk.id,
        userId: ewaId,
        done: true,
      }),
      true,
    );
    assert.equal(
      await setTaskDone({
        circleId,
        taskId: shoppingId,
        userId: ewaId,
        done: true,
      }),
      true,
    );
    assert.equal(
      await setTaskDone({
        circleId,
        taskId: shoppingId,
        userId: ewaId,
        done: true,
      }),
      false,
      "already done",
    );

    const after = await getPlan(circleId, today);
    const walkAfter = after.today.find((item) => item.id === walk.id);
    assert.equal(walkAfter?.done, true);
    assert.equal(walkAfter?.doneBy, "Ewa");
    assert.deepEqual(after.undated, []);
    assert.deepEqual(
      after.done.map((item) => item.id),
      [shoppingId],
    );

    await setTaskDone({
      circleId,
      taskId: shoppingId,
      userId: ewaId,
      done: false,
    });
    assert.deepEqual(
      (await getPlan(circleId, today)).undated.map((item) => item.id),
      [shoppingId],
    );
  });

  test("the start page counts what is left for today and what is late", async () => {
    const counts = await countOpenTasks([circleId, "nie-ma"], today);
    assert.deepEqual(counts.get(circleId), { today: 1, overdue: 1 });
    assert.deepEqual(counts.get("nie-ma"), { today: 0, overdue: 0 });

    assert.deepEqual(
      (await countOpenTasks([circleId], addDays(today, 1))).get(circleId),
      { today: 1, overdue: 2 },
      "the next day the walk is not late: it is done",
    );
    assert.equal((await countOpenTasks([], today)).size, 0);
  });

  test("the senior screen shows only today's tasks meant for it", async () => {
    const plan = await getSeniorPlan(circleId, today);
    assert.deepEqual(
      plan.map((item) => item.title),
      ["Spacer"],
    );
    assert.deepEqual(
      (await getSeniorPlan(circleId, addDays(today, 1))).map(
        (item) => item.title,
      ),
      ["Wizyta u lekarza"],
    );
  });

  test("a task can be changed", async () => {
    assert.equal(
      await updateTask({
        circleId,
        taskId: doctorId,
        userId: tomekId,
        input: task("Wizyta u kardiologa", {
          date: addDays(today, 1),
          time: "11:30",
          assigneeId: tomekId,
          note: "Zabrać wyniki",
        }),
      }),
      true,
    );
    const doctor = await getTask(circleId, doctorId);
    assert.equal(doctor?.title, "Wizyta u kardiologa");
    assert.equal(doctor?.time, "11:30");
    assert.equal(doctor?.assignee?.name, "Tomek");
    assert.equal(doctor?.showToSenior, false);
    assert.equal(
      await updateTask({
        circleId,
        taskId: "nie-ma",
        userId: tomekId,
        input: task("X"),
      }),
      false,
    );
  });

  test("only the person who added a task or a coordinator deletes it", async () => {
    assert.equal(
      await deleteTask({ circleId, taskId: shoppingId, userId: ewaId }),
      "notAllowed",
      "Ewa took it, but Tomek added it",
    );
    assert.equal(
      await deleteTask({ circleId, taskId: shoppingId, userId: aniaId }),
      "deleted",
      "Ania is a coordinator",
    );
    assert.equal(
      await deleteTask({ circleId, taskId: shoppingId, userId: aniaId }),
      "notFound",
    );
  });

  test("tasks of a person who leaves go back to the pool", async () => {
    await removeMember({ circleId, memberId: tomekId, userId: tomekId });
    assert.equal((await getTask(circleId, doctorId))?.assignee, null);
    assert.deepEqual(
      (await listTaskPeople(circleId)).map((person) => person.name),
      ["Ania", "Ewa"],
    );
  });

  test("without the tasks permission a person cannot be chosen", async () => {
    await updateMember({
      circleId,
      memberId: ewaId,
      role: "CAREGIVER",
      permissions: ["PROFILE"],
      userId: aniaId,
    });
    assert.deepEqual(
      (await listTaskPeople(circleId)).map((person) => person.name),
      ["Ania"],
    );

    const [ewaCircle] = await getMyCircles(ewaId);
    assert.equal(ewaCircle?.tasks, null, "no task summary on her start page");
    const [aniaCircle] = await getMyCircles(aniaId);
    assert.notEqual(aniaCircle?.tasks, null);
  });
});

describe("access log", () => {
  test("shows what happened to each task, also after it is deleted", async () => {
    const { entries } = await getAccessLog(circleId);
    const lines = new Set(
      entries.map(
        (entry) =>
          `${entry.actor} | ${entry.event} | ${entry.subject} | ${entry.subjectKind}`,
      ),
    );
    for (const line of [
      "Ania | createTask | Wizyta u kardiologa | task",
      "Tomek | updateTask | Wizyta u kardiologa | task",
      "Ewa | claimTask | null | task",
      "Ewa | doneTask | Spacer | task",
      "Ewa | undoneTask | null | task",
      "Ania | deleteTask | null | task",
    ]) {
      assert.ok(lines.has(line), `${line}\n${[...lines].join("\n")}`);
    }
  });
});
