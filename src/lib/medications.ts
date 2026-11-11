import type { Prisma } from "@/generated/prisma/client";
import { logAccess } from "@/lib/audit";
import {
  addDays,
  dateToDay,
  dayToDate,
  isDay,
  isTime,
  minutesOf,
  timeInPoland,
  weekdayOf,
} from "@/lib/dates";
import { db } from "@/lib/db";
import type { PairedDeviceInfo } from "@/lib/devices";

// Medicines and the doses taken (data map, section 4). This is health data:
// callers check the HEALTH permission, and the senior's paired device sees
// only today's medicines with a reminder. Days and times are Polish time.
// Anyone with HEALTH adds and changes medicines and confirms doses; the
// person who added a medicine or a coordinator can delete it.

/** At most this many times a day for one medicine. */
export const MAX_TIMES = 6;

/** The senior can confirm a dose up to two hours before its time. */
export const EARLY_MINUTES = 120;

/** A dose still not confirmed an hour after its time counts as missed. */
export const LATE_MINUTES = 60;

/** Confirmed doses are kept for 12 months (data map, decision 8). */
export const INTAKE_MONTHS = 12;

/** How many past days the medicines page sums up. */
export const RECENT_DAYS = 7;

/** Days of the week, 1 = Monday … 7 = Sunday. */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export type MedicationTimeInput = { time: string; amount: string | null };

export type MedicationInput = {
  name: string;
  note: string | null;
  /** Sorted by time; empty for a medicine taken only when needed. */
  times: MedicationTimeInput[];
  /** Days of the week; empty means every day. */
  weekdays: number[];
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string | null;
  showToSenior: boolean;
};

type TimeError = "timeRequired" | "timeInvalid" | "timeTwice";
type DayError = "dayRequired" | "dateInvalid" | "endBeforeStart";
export type MedicationError = TimeError | DayError | "nameRequired";

function validDay(day: string) {
  const year = Number(day.slice(0, 4));
  return isDay(day) && year >= 2000 && year <= 2099;
}

/**
 * Checks the medicine form. Text is trimmed and shortened to safe lengths;
 * without a first day the medicine starts today.
 */
export function parseMedication(
  fields: Record<string, unknown>,
  today: string,
): { input: MedicationInput } | { error: MedicationError } {
  const text = (key: string, max: number) =>
    String(fields[key] ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, max);

  const name = text("name", 100);
  if (!name) return { error: "nameRequired" };

  const times: MedicationTimeInput[] = [];
  if (fields.schedule !== "asNeeded") {
    for (let index = 0; index < MAX_TIMES; index++) {
      const time = text(`time${index}`, 5);
      if (!time) continue;
      if (!isTime(time)) return { error: "timeInvalid" };
      if (times.some((entry) => entry.time === time)) {
        return { error: "timeTwice" };
      }
      times.push({ time, amount: text(`amount${index}`, 40) || null });
    }
    if (times.length === 0) return { error: "timeRequired" };
    times.sort((a, b) => a.time.localeCompare(b.time));
  }

  let weekdays: number[] = [];
  if (fields.days === "chosen" && times.length > 0) {
    weekdays = WEEKDAYS.filter((day) => fields[`weekday${day}`] === "on");
    if (weekdays.length === 0) return { error: "dayRequired" };
    if (weekdays.length === WEEKDAYS.length) weekdays = [];
  }

  const startDate = text("startDate", 10) || today;
  const endDate = text("endDate", 10);
  if (!validDay(startDate) || (endDate && !validDay(endDate))) {
    return { error: "dateInvalid" };
  }
  if (endDate && endDate < startDate) return { error: "endBeforeStart" };

  return {
    input: {
      name,
      note: text("note", 200) || null,
      times,
      weekdays,
      startDate,
      endDate: endDate || null,
      showToSenior: fields.showToSenior === "on",
    },
  };
}

type Schedule = {
  weekdays: number[];
  startDate: string;
  endDate: string | null;
};

/** Whether a medicine is taken on a day, by its dates and days of the week. */
export function isTakenOn(schedule: Schedule, day: string) {
  if (day < schedule.startDate) return false;
  if (schedule.endDate && day > schedule.endDate) return false;
  return (
    schedule.weekdays.length === 0 || schedule.weekdays.includes(weekdayOf(day))
  );
}

function scheduleOf(row: {
  weekdays: number[];
  startDate: Date;
  endDate: Date | null;
}): Schedule {
  return {
    weekdays: row.weekdays,
    startDate: dateToDay(row.startDate),
    endDate: row.endDate ? dateToDay(row.endDate) : null,
  };
}

/** Medicines with times that may be taken on a day (days of the week aside). */
function scheduledOnWhere(day: string): Prisma.MedicationWhereInput {
  const date = dayToDate(day);
  return {
    times: { some: {} },
    startDate: { lte: date },
    OR: [{ endDate: null }, { endDate: { gte: date } }],
  };
}

export type MedicationView = Schedule & {
  id: string;
  name: string;
  note: string | null;
  /** Empty for a medicine taken only when needed. */
  times: MedicationTimeInput[];
  showToSenior: boolean;
  createdById: string | null;
  /** Who changed it last and when; null for a deleted account. */
  updatedBy: string | null;
  updatedAt: Date;
};

const medicationSelect = {
  id: true,
  name: true,
  note: true,
  weekdays: true,
  startDate: true,
  endDate: true,
  showToSenior: true,
  createdById: true,
  updatedAt: true,
  updatedBy: { select: { name: true } },
  times: { select: { time: true, amount: true }, orderBy: { time: "asc" } },
} satisfies Prisma.MedicationSelect;

async function findMedications(
  where: Prisma.MedicationWhereInput,
): Promise<MedicationView[]> {
  const medications = await db.medication.findMany({
    where,
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    select: medicationSelect,
  });
  return medications.map((medication) => ({
    ...scheduleOf(medication),
    id: medication.id,
    name: medication.name,
    note: medication.note,
    times: medication.times,
    showToSenior: medication.showToSenior,
    createdById: medication.createdById,
    updatedBy: medication.updatedBy?.name ?? null,
    updatedAt: medication.updatedAt,
  }));
}

/** All medicines of the circle, by name. */
export async function listMedications(circleId: string) {
  return findMedications({ circleId });
}

/** How many medicines the circle has, ended ones included. */
export async function countMedications(circleId: string) {
  return db.medication.count({ where: { circleId } });
}

/** One medicine of the circle, or null. */
export async function getMedication(circleId: string, medicationId: string) {
  const [medication] = await findMedications({ id: medicationId, circleId });
  return medication ?? null;
}

export type Dose = {
  medicationId: string;
  name: string;
  amount: string | null;
  note: string | null;
  /** HH:MM */
  time: string;
  /** Set once the dose is confirmed. */
  taken: TakenDose | null;
};

export type TakenDose = {
  /** When it was confirmed, HH:MM in Polish time. */
  at: string;
  /** The person who confirmed it; null for the senior or a deleted account. */
  by: string | null;
  bySenior: boolean;
};

/**
 * The doses of a day, by time and name, with the ones already confirmed.
 * `seniorOnly` keeps the medicines with a reminder on the senior screen.
 */
export async function getDoses(
  circleId: string,
  day: string,
  options: { seniorOnly?: boolean } = {},
): Promise<Dose[]> {
  const medications = (
    await findMedications({
      circleId,
      ...scheduledOnWhere(day),
      ...(options.seniorOnly ? { showToSenior: true } : {}),
    })
  ).filter((medication) => isTakenOn(medication, day));
  if (medications.length === 0) return [];

  const intakes = await db.medicationIntake.findMany({
    where: {
      medicationId: { in: medications.map((medication) => medication.id) },
      date: dayToDate(day),
    },
    select: {
      medicationId: true,
      time: true,
      takenAt: true,
      bySenior: true,
      confirmedBy: { select: { name: true } },
    },
  });
  const intakeOf = new Map(
    intakes.map((intake) => [`${intake.medicationId} ${intake.time}`, intake]),
  );

  const doses: Dose[] = [];
  for (const medication of medications) {
    for (const { time, amount } of medication.times) {
      const intake = intakeOf.get(`${medication.id} ${time}`);
      doses.push({
        medicationId: medication.id,
        name: medication.name,
        amount,
        note: medication.note,
        time,
        taken: intake
          ? {
              at: timeInPoland(intake.takenAt),
              by: intake.confirmedBy?.name ?? null,
              bySenior: intake.bySenior,
            }
          : null,
      });
    }
  }
  return doses.sort(
    (a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name),
  );
}

/** Whether a dose is still not confirmed an hour after its time. */
export function isMissed(dose: Dose, now: string) {
  return !dose.taken && minutesOf(now) - minutesOf(dose.time) >= LATE_MINUTES;
}

export type SlotState = "taken" | "due" | "soon" | "later";

/** The doses of one time on the senior screen, confirmed with one tap. */
export type DoseSlot = {
  time: string;
  doses: Dose[];
  /**
   * taken: everything confirmed; due: the time has come; soon: it can be
   * confirmed early; later: more than two hours ahead.
   */
  state: SlotState;
  /** When the last dose of the time was confirmed, HH:MM. */
  takenAt: string | null;
};

/** Groups doses sorted by time into the times of the day. */
export function slotsOf(doses: Dose[], now: string): DoseSlot[] {
  const slots: DoseSlot[] = [];
  for (const dose of doses) {
    const last = slots.at(-1);
    if (last?.time === dose.time) last.doses.push(dose);
    else
      slots.push({
        time: dose.time,
        doses: [dose],
        state: "later",
        takenAt: null,
      });
  }

  for (const slot of slots) {
    const confirmed = slot.doses.map((dose) => dose.taken?.at ?? null);
    if (confirmed.every((at) => at !== null)) {
      slot.state = "taken";
      slot.takenAt = confirmed.sort().at(-1) ?? null;
      continue;
    }
    const wait = minutesOf(slot.time) - minutesOf(now);
    if (wait <= 0) slot.state = "due";
    else if (wait <= EARLY_MINUTES) slot.state = "soon";
  }
  return slots;
}

export type ConfirmResult = "confirmed" | "already" | "notFound";

/** A person from the circle confirms one dose of a day. */
export async function confirmDose(params: {
  circleId: string;
  medicationId: string;
  day: string;
  time: string;
  userId: string;
}): Promise<ConfirmResult> {
  const { circleId, medicationId, day, time, userId } = params;
  const medication = await getMedication(circleId, medicationId);
  if (
    !medication ||
    !isTakenOn(medication, day) ||
    !medication.times.some((entry) => entry.time === time)
  ) {
    return "notFound";
  }

  return db.$transaction(async (tx) => {
    const created = await tx.medicationIntake.createMany({
      data: { medicationId, date: dayToDate(day), time, confirmedById: userId },
      skipDuplicates: true,
    });
    if (created.count === 0) return "already";
    await logAccess(
      {
        circleId,
        userId,
        action: "CREATE",
        entity: "MedicationIntake",
        entityId: medicationId,
      },
      tx,
    );
    return "confirmed";
  });
}

/**
 * The senior confirms on the senior screen the doses of one time that are
 * not confirmed yet: only medicines with a reminder, at most two hours
 * early. Returns how many doses were confirmed.
 */
export async function confirmSeniorDoses(params: {
  device: PairedDeviceInfo;
  day: string;
  time: string;
  /** The time now, HH:MM. */
  now: string;
}) {
  const { device, day, time, now } = params;
  if (!isTime(time) || minutesOf(time) - minutesOf(now) > EARLY_MINUTES) {
    return 0;
  }
  const open = (
    await getDoses(device.circleId, day, { seniorOnly: true })
  ).filter((dose) => dose.time === time && !dose.taken);

  return db.$transaction(async (tx) => {
    let count = 0;
    for (const dose of open) {
      const created = await tx.medicationIntake.createMany({
        data: {
          medicationId: dose.medicationId,
          date: dayToDate(day),
          time,
          bySenior: true,
        },
        skipDuplicates: true,
      });
      if (created.count === 0) continue;
      count++;
      await logAccess(
        {
          circleId: device.circleId,
          deviceId: device.id,
          deviceName: device.name,
          action: "CREATE",
          entity: "MedicationIntake",
          entityId: dose.medicationId,
        },
        tx,
      );
    }
    return count;
  });
}

/** Takes back the confirmation of a dose. False if it was not confirmed. */
export async function undoDose(params: {
  circleId: string;
  medicationId: string;
  day: string;
  time: string;
  userId: string;
}) {
  const { circleId, medicationId, day, time, userId } = params;
  return db.$transaction(async (tx) => {
    const removed = await tx.medicationIntake.deleteMany({
      where: {
        medicationId,
        date: dayToDate(day),
        time,
        medication: { circleId },
      },
    });
    if (removed.count === 0) return false;
    await logAccess(
      {
        circleId,
        userId,
        action: "DELETE",
        entity: "MedicationIntake",
        entityId: medicationId,
      },
      tx,
    );
    return true;
  });
}

/**
 * Per circle: how many doses of a day are still not confirmed an hour
 * after their time. For the cards on the start page.
 */
export async function countMissedDoses(
  circleIds: string[],
  day: string,
  now: string,
): Promise<Map<string, number>> {
  const counts = new Map(circleIds.map((id) => [id, 0]));
  if (circleIds.length === 0) return counts;

  const medications = await db.medication.findMany({
    where: { circleId: { in: circleIds }, ...scheduledOnWhere(day) },
    select: {
      circleId: true,
      weekdays: true,
      startDate: true,
      endDate: true,
      times: { select: { time: true } },
      intakes: { where: { date: dayToDate(day) }, select: { time: true } },
    },
  });
  for (const medication of medications) {
    if (!isTakenOn(scheduleOf(medication), day)) continue;
    const taken = new Set(medication.intakes.map((intake) => intake.time));
    const missed = medication.times.filter(
      ({ time }) =>
        !taken.has(time) && minutesOf(now) - minutesOf(time) >= LATE_MINUTES,
    ).length;
    counts.set(
      medication.circleId,
      (counts.get(medication.circleId) ?? 0) + missed,
    );
  }
  return counts;
}

export type DaySummary = { day: string; planned: number; taken: number };

/**
 * The days before `today`, newest first: how many doses were planned and
 * how many were confirmed. Days without planned doses are left out.
 */
export async function getRecentDays(
  circleId: string,
  today: string,
  days = RECENT_DAYS,
): Promise<DaySummary[]> {
  const first = addDays(today, -days);
  const medications = await db.medication.findMany({
    where: {
      circleId,
      times: { some: {} },
      startDate: { lt: dayToDate(today) },
      OR: [{ endDate: null }, { endDate: { gte: dayToDate(first) } }],
    },
    select: {
      weekdays: true,
      startDate: true,
      endDate: true,
      times: { select: { time: true } },
      intakes: {
        where: { date: { gte: dayToDate(first), lt: dayToDate(today) } },
        select: { date: true, time: true },
      },
    },
  });

  const summaries: DaySummary[] = [];
  for (let offset = 1; offset <= days; offset++) {
    const day = addDays(today, -offset);
    let planned = 0;
    let taken = 0;
    for (const medication of medications) {
      if (!isTakenOn(scheduleOf(medication), day)) continue;
      const takenTimes = new Set(
        medication.intakes
          .filter((intake) => dateToDay(intake.date) === day)
          .map((intake) => intake.time),
      );
      for (const { time } of medication.times) {
        planned++;
        if (takenTimes.has(time)) taken++;
      }
    }
    if (planned > 0) summaries.push({ day, planned, taken });
  }
  return summaries;
}

/** Deletes confirmations older than 12 months (data map, decision 8). */
export async function deleteOldIntakes(circleId: string, today: string) {
  const cutoff = dayToDate(today);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - INTAKE_MONTHS);
  await db.medicationIntake.deleteMany({
    where: { medication: { circleId }, date: { lt: cutoff } },
  });
}

function medicationData(input: MedicationInput) {
  return {
    name: input.name,
    note: input.note,
    weekdays: input.weekdays,
    startDate: dayToDate(input.startDate),
    endDate: input.endDate ? dayToDate(input.endDate) : null,
    showToSenior: input.showToSenior,
  };
}

/**
 * Adds a medicine and returns its id. The caller must check that the user
 * may see the circle's health data.
 */
export async function createMedication(params: {
  circleId: string;
  userId: string;
  input: MedicationInput;
}) {
  const { circleId, userId, input } = params;
  return db.$transaction(async (tx) => {
    const medication = await tx.medication.create({
      data: {
        circleId,
        createdById: userId,
        updatedById: userId,
        ...medicationData(input),
        times: { create: input.times },
      },
      select: { id: true },
    });
    await logAccess(
      {
        circleId,
        userId,
        action: "CREATE",
        entity: "Medication",
        entityId: medication.id,
      },
      tx,
    );
    return medication.id;
  });
}

/** Changes a medicine. Returns false if the circle has no such medicine. */
export async function updateMedication(params: {
  circleId: string;
  medicationId: string;
  userId: string;
  input: MedicationInput;
}) {
  const { circleId, medicationId, userId, input } = params;
  return db.$transaction(async (tx) => {
    const updated = await tx.medication.updateMany({
      where: { id: medicationId, circleId },
      data: { ...medicationData(input), updatedById: userId },
    });
    if (updated.count === 0) return false;

    await tx.medicationTime.deleteMany({ where: { medicationId } });
    if (input.times.length > 0) {
      await tx.medicationTime.createMany({
        data: input.times.map((entry) => ({ medicationId, ...entry })),
      });
    }
    await logAccess(
      {
        circleId,
        userId,
        action: "UPDATE",
        entity: "Medication",
        entityId: medicationId,
      },
      tx,
    );
    return true;
  });
}

export type DeleteMedicationResult = "deleted" | "notFound" | "notAllowed";

/**
 * Deletes a medicine with its confirmed doses: only the person who added
 * it or a coordinator may.
 */
export async function deleteMedication(params: {
  circleId: string;
  medicationId: string;
  userId: string;
}): Promise<DeleteMedicationResult> {
  const { circleId, medicationId, userId } = params;
  return db.$transaction(async (tx) => {
    const medication = await tx.medication.findFirst({
      where: { id: medicationId, circleId },
      select: { createdById: true },
    });
    if (!medication) return "notFound";
    if (medication.createdById !== userId) {
      const member = await tx.membership.findUnique({
        where: { circleId_userId: { circleId, userId } },
        select: { role: true },
      });
      if (member?.role !== "COORDINATOR") return "notAllowed";
    }

    await tx.medication.delete({ where: { id: medicationId } });
    await logAccess(
      {
        circleId,
        userId,
        action: "DELETE",
        entity: "Medication",
        entityId: medicationId,
      },
      tx,
    );
    return "deleted";
  });
}
