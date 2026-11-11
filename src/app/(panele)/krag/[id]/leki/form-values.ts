import { getFormatter } from "next-intl/server";
import { addDays, dayForDisplay } from "@/lib/dates";
import type { MedicationView } from "@/lib/medications";

/**
 * What the medicine form shows: a medicine's saved values, or what was
 * typed before an error. Days of the week are 1 = Monday … 7 = Sunday.
 */
export type MedicationFormValues = {
  name: string;
  note: string;
  schedule: Schedule;
  times: { time: string; amount: string }[];
  days: Days;
  weekdays: number[];
  startDate: string;
  endDate: string;
  showToSenior: boolean;
};

type Schedule = "times" | "asNeeded";
type Days = "every" | "chosen";

/** A new medicine: from today, every day, with a reminder for the senior. */
export function emptyValues(today: string): MedicationFormValues {
  return {
    name: "",
    note: "",
    schedule: "times",
    times: [{ time: "", amount: "" }],
    days: "every",
    weekdays: [],
    startDate: today,
    endDate: "",
    showToSenior: true,
  };
}

export function valuesOf(medication: MedicationView): MedicationFormValues {
  return {
    name: medication.name,
    note: medication.note ?? "",
    schedule: medication.times.length > 0 ? "times" : "asNeeded",
    times: medication.times.map(({ time, amount }) => ({
      time,
      amount: amount ?? "",
    })),
    days: medication.weekdays.length > 0 ? "chosen" : "every",
    weekdays: medication.weekdays,
    startDate: medication.startDate,
    endDate: medication.endDate ?? "",
    showToSenior: medication.showToSenior,
  };
}

/** 1 January 2024 was a Monday. */
const MONDAY = "2024-01-01";

/** Short names of the days of the week in the user's language, Monday first. */
export async function weekdayNames() {
  const format = await getFormatter();
  return [0, 1, 2, 3, 4, 5, 6].map((offset) =>
    format.dateTime(dayForDisplay(addDays(MONDAY, offset)), {
      weekday: "short",
    }),
  );
}
