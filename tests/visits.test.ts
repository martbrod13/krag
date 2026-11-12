// Tests of visits against a real database: the form with a weekly repeat,
// who sees which visits, starting a visit, the report, the summary on the
// start page, leaving the circle, deleting and the access log. Like the
// other tests, they create and remove their own made-up people.
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
  type VisitInput,
  type VisitViewer,
  createVisits,
  deleteVisit,
  getLatestReport,
  getTodayVisits,
  getVisit,
  getVisitsPage,
  isInProgress,
  isMissedVisit,
  parseReport,
  parseVisit,
  saveReport,
  startVisit,
  summarizeVisits,
  updateVisit,
} from "@/lib/visits";

const run = randomUUID().slice(0, 8);
const names = ["Ania", "Tomek", "Ewa", "Olga", "Obcy"];
const emails = names.map(
  (name) => `${name.toLowerCase()}.wizyty.${run}@example.com`,
);
const ids: Record<string, string> = {};
let circleId = "";

// A fixed day keeps the tests the same whenever they run: a Wednesday.
const today = "2026-11-11";

const as = (name: string, role: VisitViewer["role"]): VisitViewer => ({
  userId: ids[name],
  role,
});

function visit(
  day: string,
  visitor: string | null,
  extra: Partial<VisitInput> = {},
): VisitInput {
  return {
    days: [day],
    startTime: "09:00",
    endTime: "12:00",
    visitorId: visitor ? ids[visitor] : null,
    plan: "Obiad i spacer",
    ...extra,
  };
}

async function plan(viewer: VisitViewer, input: VisitInput) {
  const created = await createVisits({ circleId, viewer, input });
  assert.ok("ids" in created, "the visit was planned");
  return created.ids;
}

before(async () => {
  for (const [index, name] of names.entries()) {
    const user = await db.user.create({ data: { email: emails[index], name } });
    ids[name] = user.id;
  }
  circleId = (
    await createCircle(ids.Ania, {
      name: `Wizyty ${run}`,
      firstName: "Halina",
      birthDate: null,
      city: null,
    })
  ).id;
  for (const [name, role] of [
    ["Tomek", "FAMILY"],
    ["Ewa", "CAREGIVER"],
    ["Olga", "CAREGIVER"],
  ] as const) {
    const { token } = await createInvitation({
      circleId,
      invitedById: ids.Ania,
      role,
    });
    await acceptInvitation(token, ids[name]);
  }
});

after(async () => {
  await db.careCircle.deleteMany({ where: { id: circleId } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("the visit form", () => {
  test("one visit, with the plan trimmed", () => {
    assert.deepEqual(
      parseVisit({
        date: today,
        startTime: "09:00",
        endTime: "12:00",
        visitorId: "ewa",
        plan: "  Obiad  ",
      }),
      {
        input: {
          days: [today],
          startTime: "09:00",
          endTime: "12:00",
          visitorId: "ewa",
          plan: "Obiad",
        },
      },
    );
  });

  test("a weekly repeat plans the chosen days, or the first day's", () => {
    const repeat = (fields: Record<string, string>) => {
      const parsed = parseVisit({ date: today, startTime: "09:00", ...fields });
      return "input" in parsed ? parsed.input.days : parsed.error;
    };
    assert.deepEqual(
      repeat({
        repeatWeeks: "2",
        weekday1: "on",
        weekday3: "on",
        weekday5: "on",
      }),
      [
        "2026-11-11",
        "2026-11-13",
        "2026-11-16",
        "2026-11-18",
        "2026-11-20",
        "2026-11-23",
      ],
    );
    assert.deepEqual(repeat({ repeatWeeks: "2" }), [today, "2026-11-18"]);
    assert.deepEqual(repeat({ repeatWeeks: "3" }), [today], "not offered");
  });

  test("needs a real day and times", () => {
    const errorOf = (fields: Record<string, string>) => {
      const parsed = parseVisit(fields);
      return "error" in parsed ? parsed.error : null;
    };
    assert.equal(
      errorOf({ date: "2026-13-01", startTime: "09:00" }),
      "dateInvalid",
    );
    assert.equal(errorOf({ date: today }), "startRequired");
    assert.equal(errorOf({ date: today, startTime: "25:00" }), "timeInvalid");
    assert.equal(
      errorOf({ date: today, startTime: "09:00", endTime: "9" }),
      "timeInvalid",
    );
  });

  test("the report keeps known activities in order", () => {
    assert.deepEqual(
      parseReport({
        actualStart: "09:05",
        actualEnd: "11:50",
        "activity-walk": "on",
        "activity-meal": "on",
        "activity-dancing": "on",
        report: "  Dobry dzień  ",
      }),
      {
        input: {
          actualStart: "09:05",
          actualEnd: "11:50",
          activities: ["meal", "walk"],
          report: "Dobry dzień",
        },
      },
    );
    assert.deepEqual(parseReport({ actualStart: "09:05" }), {
      error: "timeInvalid",
    });
  });
});

describe("visits", () => {
  const tomorrow = addDays(today, 1);
  let ewaToday = "";
  let ewaTomorrow = "";
  let olgaToday = "";
  let ewaOwn = "";

  test("family plans visits for people who see visits", async () => {
    const ania = as("Ania", "COORDINATOR");
    [ewaToday] = await plan(ania, visit(today, "Ewa"));
    [ewaTomorrow] = await plan(ania, visit(tomorrow, "Ewa"));
    [olgaToday] = await plan(
      ania,
      visit(today, "Olga", { startTime: "14:00", endTime: null }),
    );
    const series = await plan(
      ania,
      visit("2026-11-16", "Ewa", { days: ["2026-11-16", "2026-11-23"] }),
    );
    assert.equal(series.length, 2);

    for (const visitor of ["Obcy", null]) {
      assert.deepEqual(
        await createVisits({
          circleId,
          viewer: ania,
          input: visit(today, visitor),
        }),
        { error: "visitorRequired" },
      );
    }
  });

  test("a caregiver plans only their own visits", async () => {
    [ewaOwn] = await plan(
      as("Ewa", "CAREGIVER"),
      visit(addDays(today, 2), "Tomek"),
    );
    const own = await getVisit(circleId, ewaOwn, as("Ewa", "CAREGIVER"));
    assert.equal(own?.visitor?.name, "Ewa");
  });

  test("family sees every visit, a caregiver only their own", async () => {
    const family = await getVisitsPage(circleId, as("Tomek", "FAMILY"), today);
    assert.deepEqual(
      family.today.map((item) => `${item.startTime} ${item.visitor?.name}`),
      ["09:00 Ewa", "14:00 Olga"],
    );
    assert.deepEqual(
      family.upcoming.map((group) => group.day),
      [tomorrow, addDays(today, 2), "2026-11-16", "2026-11-23"],
    );

    const ewa = await getVisitsPage(circleId, as("Ewa", "CAREGIVER"), today);
    assert.deepEqual(
      ewa.today.map((item) => item.visitor?.name),
      ["Ewa"],
    );
    assert.equal(
      await getVisit(circleId, olgaToday, as("Ewa", "CAREGIVER")),
      null,
    );

    assert.equal((await getTodayVisits(circleId, today)).length, 2, "senior");
    assert.equal(
      (await getTodayVisits(circleId, today, as("Ewa", "CAREGIVER"))).length,
      1,
    );
  });

  test("only the person who comes starts a visit, on its day", async () => {
    const start = (visitId: string, name: string) =>
      startVisit({ circleId, visitId, userId: ids[name], today, now: "09:04" });
    assert.equal(await start(ewaToday, "Tomek"), "notYours");
    assert.equal(await start(ewaTomorrow, "Ewa"), "notToday");
    assert.equal(await start(ewaToday, "Ewa"), "started");
    assert.equal(await start(ewaToday, "Ewa"), "already");

    const family = await getVisitsPage(circleId, as("Tomek", "FAMILY"), today);
    assert.deepEqual(
      family.inProgress.map((item) => item.id),
      [ewaToday],
    );
    assert.ok(isInProgress(family.inProgress[0]));
    assert.deepEqual(
      family.today.map((item) => item.id),
      [olgaToday],
    );
  });

  test("the start page shows the visit that matters now", async () => {
    const family = await summarizeVisits(
      [{ circleId, role: "FAMILY" }],
      ids.Tomek,
      today,
    );
    assert.equal(family.get(circleId)?.visitor, "Ewa", "the one in progress");
    assert.equal(family.get(circleId)?.actualStart, "09:04");

    const olga = await summarizeVisits(
      [{ circleId, role: "CAREGIVER" }],
      ids.Olga,
      today,
    );
    assert.equal(olga.get(circleId)?.startTime, "14:00", "only her own");
  });

  test("only the person who came writes the report", async () => {
    const input = {
      actualStart: "09:04",
      actualEnd: "11:50",
      activities: ["meal" as const, "walk" as const],
      report: "Obiad zjedzony, krótki spacer.",
    };
    const report = (visitId: string, name: string) =>
      saveReport({ circleId, visitId, userId: ids[name], today, input });
    assert.equal(await report(ewaToday, "Tomek"), "notYours");
    assert.equal(await report(ewaTomorrow, "Ewa"), "notYet");
    assert.equal(await report(ewaToday, "Ewa"), "saved");

    const done = await getVisit(circleId, ewaToday, as("Tomek", "FAMILY"));
    assert.equal(done?.actualEnd, "11:50");
    assert.deepEqual(done?.activities, ["meal", "walk"]);
    assert.ok(done?.reportedAt);
    assert.ok(done && !isInProgress(done));

    assert.equal(
      (await getLatestReport(circleId, as("Tomek", "FAMILY")))?.id,
      ewaToday,
    );
    assert.equal(
      await getLatestReport(circleId, as("Olga", "CAREGIVER")),
      null,
      "not someone else's report",
    );
    const family = await summarizeVisits(
      [{ circleId, role: "FAMILY" }],
      ids.Tomek,
      today,
    );
    assert.equal(family.get(circleId)?.visitor, "Olga", "the next one now");
  });

  test("a past visit nobody started counts as not recorded", async () => {
    const [missedId] = await plan(
      as("Ania", "COORDINATOR"),
      visit(addDays(today, -1), "Ewa"),
    );
    const { past } = await getVisitsPage(
      circleId,
      as("Tomek", "FAMILY"),
      today,
    );
    const missed = past.find((item) => item.id === missedId);
    assert.ok(missed && isMissedVisit(missed, today));
  });

  test("the day and the person can be changed", async () => {
    assert.equal(
      await updateVisit({
        circleId,
        visitId: ewaTomorrow,
        viewer: as("Tomek", "FAMILY"),
        input: visit(tomorrow, "Olga", { startTime: "10:00" }),
      }),
      "saved",
    );
    const moved = await getVisit(circleId, ewaTomorrow, as("Tomek", "FAMILY"));
    assert.equal(moved?.startTime, "10:00");
    assert.equal(moved?.visitor?.name, "Olga");

    assert.equal(
      await updateVisit({
        circleId,
        visitId: olgaToday,
        viewer: as("Ewa", "CAREGIVER"),
        input: visit(today, "Ewa"),
      }),
      "notFound",
      "a caregiver does not see someone else's visit",
    );
    assert.equal(
      await updateVisit({
        circleId,
        visitId: ewaOwn,
        viewer: as("Ewa", "CAREGIVER"),
        input: visit(addDays(today, 3), "Tomek"),
      }),
      "saved",
    );
    const own = await getVisit(circleId, ewaOwn, as("Ewa", "CAREGIVER"));
    assert.equal(own?.visitor?.name, "Ewa", "still her own");
    assert.equal(own?.date, addDays(today, 3));

    assert.equal(
      await updateVisit({
        circleId,
        visitId: ewaTomorrow,
        viewer: as("Tomek", "FAMILY"),
        input: visit(tomorrow, "Obcy"),
      }),
      "visitorRequired",
    );
  });

  test("leaving the circle frees the person's future visits", async () => {
    // Leaving works with the real day, so these visits use it.
    const realToday = todayInPoland();
    const ania = as("Ania", "COORDINATOR");
    const [future] = await plan(ania, visit(addDays(realToday, 1), "Olga"));
    const [earlier] = await plan(ania, visit(addDays(realToday, -1), "Olga"));

    assert.equal(
      await removeMember({ circleId, memberId: ids.Olga, userId: ids.Ania }),
      "ok",
    );
    const family = as("Tomek", "FAMILY");
    assert.equal((await getVisit(circleId, future, family))?.visitor, null);
    assert.equal(
      (await getVisit(circleId, earlier, family))?.visitor?.name,
      "Olga",
      "the past stays as it was",
    );
  });

  test("only the person who planned a visit or a coordinator deletes it", async () => {
    const remove = (visitId: string, name: string) =>
      deleteVisit({ circleId, visitId, userId: ids[name] });
    assert.equal(await remove(ewaToday, "Tomek"), "notAllowed");
    assert.equal(await remove(ewaOwn, "Ewa"), "deleted");
    assert.equal(await remove(ewaToday, "Ania"), "deleted");
    assert.equal(await remove(ewaToday, "Ania"), "notFound");
  });

  test("the start page card shows today's visit only with access to visits", async () => {
    await plan(
      as("Ania", "COORDINATOR"),
      visit(todayInPoland(), "Ewa", { startTime: "07:00" }),
    );
    const [ewaCircle] = await getMyCircles(ids.Ewa);
    assert.equal(ewaCircle?.visit?.startTime, "07:00");

    await updateMember({
      circleId,
      memberId: ids.Tomek,
      role: "FAMILY",
      permissions: ["PROFILE", "TASKS"],
      userId: ids.Ania,
    });
    const [tomekCircle] = await getMyCircles(ids.Tomek);
    assert.equal(tomekCircle?.visit, null);
  });
});

describe("access log", () => {
  test("shows what happened to visits without copying reports", async () => {
    const { entries } = await getAccessLog(circleId);
    const lines = entries.map(
      (entry) =>
        `${entry.actor} | ${entry.event} | ${entry.subject} | ${entry.subjectKind}`,
    );
    for (const line of [
      "Ania | createVisit | Ewa | visit",
      "Ewa | startVisit | null | visit",
      "Ewa | reportVisit | null | visit",
      "Ania | deleteVisit | null | visit",
    ]) {
      assert.ok(lines.includes(line), `${line}\n${lines.join("\n")}`);
    }
    assert.ok(lines.some((line) => line.startsWith("Tomek | updateVisit |")));
    assert.ok(
      !lines.some((line) => line.includes("Obiad")),
      "no plan or report text in the log",
    );
  });
});
