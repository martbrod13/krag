// Tests of medicines against a real database: the form, the days a medicine
// is taken, today's doses, "taken" from the family and from the senior
// screen, missed doses, the last days, deleting and the access log.
// Like the other tests, they create and remove their own made-up people.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { getAccessLog } from "@/lib/access-log";
import { createCircle, getMyCircles } from "@/lib/circles";
import {
  addDays,
  dayToDate,
  minutesOf,
  timeInPoland,
  weekdayOf,
} from "@/lib/dates";
import { db } from "@/lib/db";
import type { PairedDeviceInfo } from "@/lib/devices";
import { acceptInvitation, createInvitation } from "@/lib/invitations";
import {
  type MedicationInput,
  confirmDose,
  confirmSeniorDoses,
  countMissedDoses,
  createMedication,
  deleteMedication,
  deleteOldIntakes,
  getDoses,
  getMedication,
  getRecentDays,
  isMissed,
  isTakenOn,
  listMedications,
  parseMedication,
  slotsOf,
  undoDose,
  updateMedication,
} from "@/lib/medications";
import { updateMember } from "@/lib/members";
import { hashToken, newToken } from "@/lib/tokens";

const run = randomUUID().slice(0, 8);
const emails = ["ania", "tomek", "ewa"].map(
  (name) => `${name}.leki.${run}@example.com`,
);
let aniaId = ""; // coordinator
let tomekId = ""; // family
let ewaId = ""; // caregiver
let circleId = "";
let device: PairedDeviceInfo;

// A fixed day keeps the tests the same whenever they run: a Wednesday.
const today = "2026-11-11";

function medicine(
  name: string,
  extra: Partial<MedicationInput> = {},
): MedicationInput {
  return {
    name,
    note: null,
    times: [{ time: "08:00", amount: "1 tabletka" }],
    weekdays: [],
    startDate: addDays(today, -10),
    endDate: null,
    showToSenior: true,
    ...extra,
  };
}

before(async () => {
  const [ania, tomek, ewa] = await Promise.all(
    emails.map((email, index) =>
      db.user.create({
        data: { email, name: ["Ania", "Tomek", "Ewa"][index] },
      }),
    ),
  );
  aniaId = ania.id;
  tomekId = tomek.id;
  ewaId = ewa.id;

  circleId = (
    await createCircle(aniaId, {
      name: `Leki ${run}`,
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

  device = await db.pairedDevice.create({
    data: {
      circleId,
      name: "Tablet testowy",
      tokenHash: hashToken(newToken()),
    },
    select: { id: true, circleId: true, name: true },
  });
});

after(async () => {
  await db.careCircle.deleteMany({ where: { id: circleId } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("days and times in Poland", () => {
  test("the time and the day of the week are Polish", () => {
    assert.equal(timeInPoland(new Date("2026-11-11T07:05:00Z")), "08:05");
    assert.equal(timeInPoland(new Date("2026-07-01T06:30:00Z")), "08:30");
    assert.equal(timeInPoland(new Date("2026-11-11T23:00:00Z")), "00:00");
    assert.equal(weekdayOf("2026-11-11"), 3);
    assert.equal(weekdayOf("2026-11-15"), 7);
    assert.equal(minutesOf("08:30"), 510);
  });
});

describe("the medicine form", () => {
  test("trims text, sorts the times and starts today by default", () => {
    const parsed = parseMedication(
      {
        name: "  Metformina   500 mg ",
        schedule: "times",
        time0: "20:00",
        amount0: "1 tabletka",
        time1: "08:00",
        amount1: " 1  tabletka ",
        time2: "",
        amount2: "bez godziny",
        days: "every",
        startDate: "",
        endDate: "",
        note: " po jedzeniu ",
        showToSenior: "on",
      },
      today,
    );
    assert.deepEqual(parsed, {
      input: {
        name: "Metformina 500 mg",
        note: "po jedzeniu",
        times: [
          { time: "08:00", amount: "1 tabletka" },
          { time: "20:00", amount: "1 tabletka" },
        ],
        weekdays: [],
        startDate: today,
        endDate: null,
        showToSenior: true,
      },
    });
  });

  test("understands “when needed” and chosen days", () => {
    const asNeeded = parseMedication(
      { name: "Paracetamol", schedule: "asNeeded", time0: "08:00" },
      today,
    );
    assert.ok("input" in asNeeded);
    assert.deepEqual(asNeeded.input.times, []);
    assert.equal(asNeeded.input.showToSenior, false);

    const chosen = parseMedication(
      {
        name: "Witamina D",
        time0: "08:00",
        days: "chosen",
        weekday7: "on",
        weekday3: "on",
      },
      today,
    );
    assert.ok("input" in chosen);
    assert.deepEqual(chosen.input.weekdays, [3, 7]);

    const allDays = Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((day) => [`weekday${day}`, "on"]),
    );
    const everyDay = parseMedication(
      { name: "Witamina D", time0: "08:00", days: "chosen", ...allDays },
      today,
    );
    assert.ok("input" in everyDay);
    assert.deepEqual(everyDay.input.weekdays, [], "all days mean every day");
  });

  test("needs a name, real times and days, and a sensible last day", () => {
    const errorOf = (fields: Record<string, string>) => {
      const parsed = parseMedication(fields, today);
      return "error" in parsed ? parsed.error : null;
    };
    const lek = { name: "Lek", time0: "08:00" };
    assert.equal(errorOf({ ...lek, name: "  " }), "nameRequired");
    assert.equal(errorOf({ name: "Lek" }), "timeRequired");
    assert.equal(errorOf({ ...lek, time0: "25:00" }), "timeInvalid");
    assert.equal(errorOf({ ...lek, time1: "08:00" }), "timeTwice");
    assert.equal(errorOf({ ...lek, days: "chosen" }), "dayRequired");
    assert.equal(errorOf({ ...lek, startDate: "2026-02-30" }), "dateInvalid");
    assert.equal(
      errorOf({ ...lek, startDate: today, endDate: addDays(today, -1) }),
      "endBeforeStart",
    );
    assert.equal(errorOf({ ...lek, endDate: today }), null);
  });
});

describe("days a medicine is taken", () => {
  test("from the first to the last day, on its days of the week", () => {
    const schedule = { weekdays: [], startDate: "2026-11-01", endDate: null };
    assert.equal(isTakenOn(schedule, today), true);
    assert.equal(isTakenOn(schedule, "2026-10-31"), false);
    assert.equal(
      isTakenOn({ ...schedule, endDate: "2026-11-10" }, today),
      false,
    );
    assert.equal(isTakenOn({ ...schedule, weekdays: [7] }, today), false);
    assert.equal(isTakenOn({ ...schedule, weekdays: [7] }, "2026-11-15"), true);
  });
});

describe("medicines and doses", () => {
  let metforminaId = "";
  let bisoprololId = "";
  let futureId = "";

  test("today's doses come by time, with or without the senior's ones", async () => {
    metforminaId = await createMedication({
      circleId,
      userId: aniaId,
      input: medicine("Metformina 500 mg", {
        times: [
          { time: "08:00", amount: "1 tabletka" },
          { time: "20:00", amount: "1 tabletka" },
        ],
      }),
    });
    bisoprololId = await createMedication({
      circleId,
      userId: ewaId,
      input: medicine("Bisoprolol 2,5 mg", { showToSenior: false }),
    });
    await createMedication({
      circleId,
      userId: aniaId,
      input: medicine("Witamina D3", { weekdays: [7] }),
    });
    await createMedication({
      circleId,
      userId: aniaId,
      input: medicine("Paracetamol 500 mg", { times: [] }),
    });
    await createMedication({
      circleId,
      userId: aniaId,
      input: medicine("Antybiotyk", {
        startDate: addDays(today, -5),
        endDate: addDays(today, -1),
      }),
    });
    futureId = await createMedication({
      circleId,
      userId: tomekId,
      input: medicine("Nowy lek", { startDate: addDays(today, 1) }),
    });

    assert.equal((await listMedications(circleId)).length, 6);
    const doses = await getDoses(circleId, today);
    assert.deepEqual(
      doses.map((dose) => `${dose.time} ${dose.name}`),
      [
        "08:00 Bisoprolol 2,5 mg",
        "08:00 Metformina 500 mg",
        "20:00 Metformina 500 mg",
      ],
    );
    assert.deepEqual(
      (await getDoses(circleId, today, { seniorOnly: true })).map(
        (dose) => `${dose.time} ${dose.name}`,
      ),
      ["08:00 Metformina 500 mg", "20:00 Metformina 500 mg"],
    );
    assert.ok(
      (await getDoses(circleId, "2026-11-15")).some(
        (dose) => dose.name === "Witamina D3",
      ),
      "the vitamin on Sundays",
    );
  });

  test("a person confirms a dose once and can take it back", async () => {
    const dose = {
      circleId,
      medicationId: metforminaId,
      day: today,
      time: "08:00",
      userId: tomekId,
    };
    assert.equal(await confirmDose(dose), "confirmed");
    assert.equal(await confirmDose(dose), "already");
    assert.equal(await confirmDose({ ...dose, time: "12:00" }), "notFound");
    assert.equal(
      await confirmDose({ ...dose, medicationId: futureId }),
      "notFound",
      "not taken yet",
    );

    const taken = (await getDoses(circleId, today))[1].taken;
    assert.equal(taken?.by, "Tomek");
    assert.equal(taken?.bySenior, false);
    assert.match(taken?.at ?? "", /^\d\d:\d\d$/);

    assert.equal(await undoDose(dose), true);
    assert.equal(await undoDose(dose), false);
  });

  test("the senior confirms a time at most two hours early", async () => {
    const tap = { device, day: today, time: "08:00" };
    assert.equal(await confirmSeniorDoses({ ...tap, now: "05:59" }), 0);
    assert.equal(
      await confirmSeniorDoses({ ...tap, now: "06:00" }),
      1,
      "only the medicine with a reminder",
    );
    assert.equal(await confirmSeniorDoses({ ...tap, now: "08:05" }), 0);

    const doses = await getDoses(circleId, today);
    assert.equal(doses[0].taken, null, "the medicine without a reminder");
    assert.equal(doses[1].taken?.bySenior, true);
    assert.equal(doses[1].taken?.by, null);
  });

  test("times of the day: taken, due, soon and later", async () => {
    const senior = await getDoses(circleId, today, { seniorOnly: true });
    const states = (now: string) =>
      slotsOf(senior, now).map((slot) => `${slot.time} ${slot.state}`);
    assert.deepEqual(states("07:00"), ["08:00 taken", "20:00 later"]);
    assert.deepEqual(states("18:00"), ["08:00 taken", "20:00 soon"]);
    assert.deepEqual(states("20:30"), ["08:00 taken", "20:00 due"]);
    assert.match(slotsOf(senior, "09:00")[0].takenAt ?? "", /^\d\d:\d\d$/);

    const family = slotsOf(await getDoses(circleId, today), "08:30");
    assert.equal(family[0].doses.length, 2);
    assert.equal(family[0].state, "due", "one of two is still to take");
  });

  test("a dose an hour late counts as missed", async () => {
    const [bisoprolol] = await getDoses(circleId, today);
    assert.equal(isMissed(bisoprolol, "08:59"), false);
    assert.equal(isMissed(bisoprolol, "09:00"), true);

    const counts = await countMissedDoses([circleId, "nie-ma"], today, "09:30");
    assert.equal(counts.get(circleId), 1);
    assert.equal(counts.get("nie-ma"), 0);
    assert.equal(
      (await countMissedDoses([circleId], today, "21:30")).get(circleId),
      2,
    );
    assert.equal((await countMissedDoses([], today, "21:30")).size, 0);
  });

  test("the last days show planned and confirmed doses", async () => {
    const yesterday = addDays(today, -1);
    for (const [medicationId, time] of [
      [metforminaId, "08:00"],
      [metforminaId, "20:00"],
      [bisoprololId, "08:00"],
    ]) {
      await confirmDose({
        circleId,
        medicationId,
        day: yesterday,
        time,
        userId: ewaId,
      });
    }
    assert.deepEqual(await getRecentDays(circleId, today, 2), [
      { day: yesterday, planned: 4, taken: 3 },
      { day: addDays(today, -2), planned: 4, taken: 0 },
    ]);
  });

  test("confirmations older than 12 months are deleted", async () => {
    await db.medicationIntake.create({
      data: {
        medicationId: metforminaId,
        date: dayToDate(addDays(today, -400)),
        time: "08:00",
        bySenior: true,
      },
    });
    await deleteOldIntakes(circleId, today);
    const left = await db.medicationIntake.findMany({
      where: { medication: { circleId } },
      select: { date: true },
    });
    assert.equal(left.length, 4, "yesterday's three and today's one");
  });

  test("a medicine can be changed", async () => {
    assert.equal(
      await updateMedication({
        circleId,
        medicationId: metforminaId,
        userId: tomekId,
        input: medicine("Metformina 500 mg", {
          times: [{ time: "08:00", amount: "2 tabletki" }],
          note: "Po jedzeniu.",
        }),
      }),
      true,
    );
    const changed = await getMedication(circleId, metforminaId);
    assert.deepEqual(changed?.times, [{ time: "08:00", amount: "2 tabletki" }]);
    assert.equal(changed?.note, "Po jedzeniu.");
    assert.equal(changed?.updatedBy, "Tomek");

    assert.equal(
      await updateMedication({
        circleId,
        medicationId: "nie-ma",
        userId: tomekId,
        input: medicine("Lek"),
      }),
      false,
    );
  });

  test("only the person who added a medicine or a coordinator deletes it", async () => {
    const remove = (medicationId: string, userId: string) =>
      deleteMedication({ circleId, medicationId, userId });
    assert.equal(await remove(bisoprololId, tomekId), "notAllowed");
    assert.equal(await remove(bisoprololId, ewaId), "deleted");
    assert.equal(await remove(futureId, aniaId), "deleted");
    assert.equal(await remove(futureId, aniaId), "notFound");
    assert.equal(
      await db.medicationIntake.count({
        where: { medicationId: bisoprololId },
      }),
      0,
      "its history goes too",
    );
  });

  test("the start page shows missed doses only with access to health data", async () => {
    const [aniaCircle] = await getMyCircles(aniaId);
    assert.equal(typeof aniaCircle?.missedDoses, "number");

    await updateMember({
      circleId,
      memberId: tomekId,
      role: "FAMILY",
      permissions: ["PROFILE", "TASKS"],
      userId: aniaId,
    });
    const [tomekCircle] = await getMyCircles(tomekId);
    assert.equal(tomekCircle?.missedDoses, null);
  });
});

describe("access log", () => {
  test("shows what happened to each medicine, also after it is deleted", async () => {
    const { entries } = await getAccessLog(circleId);
    const lines = new Set(
      entries.map(
        (entry) =>
          `${entry.actor} | ${entry.event} | ${entry.subject} | ${entry.subjectKind}`,
      ),
    );
    for (const line of [
      "Ania | createMedication | Metformina 500 mg | medication",
      "Tomek | takeDose | Metformina 500 mg | medication",
      "Tomek | undoDose | Metformina 500 mg | medication",
      "Tablet testowy | takeDose | Metformina 500 mg | medication",
      "Tomek | updateMedication | Metformina 500 mg | medication",
      "Ewa | createMedication | null | medication",
      "Ewa | deleteMedication | null | medication",
    ]) {
      assert.ok(lines.has(line), `${line}\n${[...lines].join("\n")}`);
    }
  });
});
