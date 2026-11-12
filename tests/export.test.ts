// Tests of "download my data" against a real database: everything in a
// circle for its coordinator, a person's own data, nothing from other
// circles, and the download in the access log. Like the other tests, they
// create and remove their own made-up people.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { getAccessLog } from "@/lib/access-log";
import { createCircle } from "@/lib/circles";
import { addContact } from "@/lib/contacts";
import { db } from "@/lib/db";
import { exportAccount, exportCircle, fileSlug } from "@/lib/export";
import { acceptInvitation, createInvitation } from "@/lib/invitations";
import { confirmDose, createMedication } from "@/lib/medications";
import { updateMember } from "@/lib/members";
import { createTask } from "@/lib/tasks";
import { hashToken, newToken } from "@/lib/tokens";
import { createVisits, saveReport } from "@/lib/visits";

const run = randomUUID().slice(0, 8);
const names = ["Ania", "Tomek", "Ewa"];
const emails = names.map(
  (name) => `${name.toLowerCase()}.eksport.${run}@example.com`,
);
const ids: Record<string, string> = {};
let circleId = "";
let otherCircleId = "";

// A fixed day keeps the tests the same whenever they run.
const today = "2026-11-11";

before(async () => {
  for (const [index, name] of names.entries()) {
    const user = await db.user.create({
      data: { email: emails[index], name },
    });
    ids[name] = user.id;
  }
  circleId = (
    await createCircle(ids.Ania, {
      name: `Eksport ${run}`,
      firstName: "Halina",
      birthDate: new Date("1948-03-02T00:00:00Z"),
      city: "Katowice",
    })
  ).id;
  otherCircleId = (
    await createCircle(ids.Tomek, {
      name: `Inny krąg ${run}`,
      firstName: "Zenon",
      birthDate: null,
      city: null,
    })
  ).id;
  for (const [name, role] of [
    ["Tomek", "FAMILY"],
    ["Ewa", "CAREGIVER"],
  ] as const) {
    const { token } = await createInvitation({
      circleId,
      invitedById: ids.Ania,
      role,
    });
    await acceptInvitation(token, ids[name]);
  }

  await addContact({
    circleId,
    userId: ids.Ania,
    input: { name: "Zofia", phone: "+48100000001", relationship: "córka" },
  });
  await db.pairedDevice.create({
    data: {
      circleId,
      name: "Tablet testowy",
      tokenHash: hashToken(newToken()),
    },
  });
  const task = {
    note: null,
    date: today,
    time: "10:00",
    showToSenior: false,
  };
  await createTask({
    circleId,
    userId: ids.Ania,
    input: { ...task, title: "Wizyta u lekarza", assigneeId: ids.Ewa },
  });
  await createTask({
    circleId: otherCircleId,
    userId: ids.Tomek,
    input: { ...task, title: "Zadanie z innego kręgu", assigneeId: null },
  });

  const medicationId = await createMedication({
    circleId,
    userId: ids.Ania,
    input: {
      name: "Metformina 500 mg",
      note: "Po jedzeniu.",
      times: [{ time: "08:00", amount: "1 tabletka" }],
      weekdays: [],
      startDate: "2026-11-01",
      endDate: null,
      showToSenior: true,
    },
  });
  await confirmDose({
    circleId,
    medicationId,
    day: today,
    time: "08:00",
    userId: ids.Ewa,
  });

  const created = await createVisits({
    circleId,
    viewer: { userId: ids.Ania, role: "COORDINATOR" },
    input: {
      days: [today],
      startTime: "09:00",
      endTime: "12:00",
      visitorId: ids.Ewa,
      plan: "Obiad",
    },
  });
  assert.ok("ids" in created);
  await saveReport({
    circleId,
    visitId: created.ids[0],
    userId: ids.Ewa,
    today,
    input: {
      actualStart: "09:05",
      actualEnd: "11:55",
      activities: ["walk", "meal"],
      report: "Spacer i obiad.",
    },
  });
});

after(async () => {
  await db.careCircle.deleteMany({
    where: { id: { in: [circleId, otherCircleId] } },
  });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("file names", () => {
  test("come from the circle's name without Polish letters", () => {
    assert.equal(fileSlug("Mama Halina"), "mama-halina");
    assert.equal(fileSlug("  Łąka, żółw & Ćma! "), "laka-zolw-cma");
    assert.equal(fileSlug("Мама Галина"), "", "the caller adds a fallback");
  });
});

describe("the circle's data", () => {
  test("has everything in the circle and nothing from others", async () => {
    const data = await exportCircle(circleId, ids.Ania);
    assert.ok(data);
    assert.equal(data.format, "krag-circle");
    assert.equal(data.circle.name, `Eksport ${run}`);
    assert.deepEqual(data.careRecipient, {
      firstName: "Halina",
      birthDate: "1948-03-02",
      city: "Katowice",
      address: null,
      primaryDoctor: null,
    });
    assert.deepEqual(data.emergencyContacts, [
      { name: "Zofia", phone: "+48100000001", relationship: "córka" },
    ]);
    assert.deepEqual(
      data.members.map((member) => `${member.name} ${member.role}`),
      ["Ania COORDINATOR", "Tomek FAMILY", "Ewa CAREGIVER"],
    );
    assert.equal(data.devices[0]?.name, "Tablet testowy");

    assert.deepEqual(
      data.tasks.map((task) => `${task.title} ${task.assignee}`),
      ["Wizyta u lekarza Ewa"],
    );
    const [medication] = data.medications;
    assert.equal(medication.name, "Metformina 500 mg");
    assert.deepEqual(medication.times, [
      { time: "08:00", amount: "1 tabletka" },
    ]);
    assert.equal(medication.doses.length, 1);
    assert.equal(medication.doses[0].confirmedBy, "Ewa");

    const [visit] = data.visits;
    assert.equal(visit.visitor, "Ewa");
    assert.deepEqual(visit.activities, ["meal", "walk"]);
    assert.equal(visit.report, "Spacer i obiad.");

    assert.ok(data.accessLog.length > 0);
    const text = JSON.stringify(data);
    assert.ok(!text.includes("Zadanie z innego kręgu"));
    assert.ok(!text.includes("Zenon"));
    assert.ok(!text.includes("@example.com"), "no e-mail addresses of others");
  });

  test("the download goes into the access log", async () => {
    const { entries } = await getAccessLog(circleId);
    assert.equal(entries[0]?.event, "exportCircle");
    assert.equal(entries[0]?.actor, "Ania");
  });

  test("a circle that does not exist gives nothing", async () => {
    assert.equal(await exportCircle("nie-ma", ids.Ania), null);
  });
});

describe("a person's own data", () => {
  test("has the account, circles and their own tasks and visits", async () => {
    const data = await exportAccount(ids.Ewa);
    assert.ok(data);
    assert.equal(data.format, "krag-account");
    assert.equal(data.account.email, emails[2]);
    assert.deepEqual(
      data.circles.map((circle) => `${circle.name} ${circle.role}`),
      [`Eksport ${run} CAREGIVER`],
    );
    const [circle] = data.circles;
    assert.equal(circle.invitedBy, "Ania");
    assert.deepEqual(
      circle.tasks.map((task) => [task.title, task.takenByMe, task.addedByMe]),
      [["Wizyta u lekarza", true, false]],
    );
    assert.equal(circle.visits.length, 1);
    assert.equal(circle.visits[0].actualEnd, "11:55");
    assert.ok(!JSON.stringify(data).includes("Metformina"), "no medicines");
  });

  test("leaves out what the person does not see and others' visits", async () => {
    const tomek = await exportAccount(ids.Tomek);
    assert.ok(tomek);
    const shared = tomek.circles.find((circle) => circle.role === "FAMILY");
    assert.deepEqual(shared?.visits, [], "Ewa's visits are not his");
    assert.deepEqual(shared?.tasks, []);

    await updateMember({
      circleId,
      memberId: ids.Ewa,
      role: "CAREGIVER",
      permissions: ["PROFILE"],
      userId: ids.Ania,
    });
    const ewa = await exportAccount(ids.Ewa);
    assert.deepEqual(ewa?.circles[0].tasks, []);
    assert.deepEqual(ewa?.circles[0].visits, []);
  });

  test("an account that does not exist gives nothing", async () => {
    assert.equal(await exportAccount("nie-ma"), null);
  });
});
