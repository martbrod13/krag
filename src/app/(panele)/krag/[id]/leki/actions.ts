"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/circles";
import { isTime, todayInPoland } from "@/lib/dates";
import {
  MAX_TIMES,
  WEEKDAYS,
  confirmDose,
  createMedication,
  deleteMedication,
  parseMedication,
  undoDose,
  updateMedication,
} from "@/lib/medications";
import { currentUserId } from "@/lib/session";
import type { MedicationFormValues } from "./form-values";
import type { MedicationFormState } from "./medication-form";

// The circle page shows today's doses, the medicines page all of it.
function refresh(circleId: string) {
  revalidatePath(`/krag/${circleId}`);
  revalidatePath(`/krag/${circleId}/leki`);
}

/** The user's id, if they may see and change the circle's health data. */
async function healthUser(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const allowed = await hasPermission(circleId, userId, "HEALTH");
  return { userId, circleId, allowed };
}

/** What was typed, shown again after an error (React empties the form). */
function typedValues(formData: FormData): MedicationFormValues {
  const field = (key: string) => String(formData.get(key) ?? "");
  const times: MedicationFormValues["times"] = [];
  for (let index = 0; index < MAX_TIMES; index++) {
    if (!formData.has(`time${index}`)) break;
    times.push({
      time: field(`time${index}`),
      amount: field(`amount${index}`),
    });
  }
  return {
    name: field("name"),
    note: field("note"),
    schedule: field("schedule") === "asNeeded" ? "asNeeded" : "times",
    times,
    days: field("days") === "chosen" ? "chosen" : "every",
    weekdays: WEEKDAYS.filter((day) => field(`weekday${day}`) === "on"),
    startDate: field("startDate"),
    endDate: field("endDate"),
    showToSenior: field("showToSenior") === "on",
  };
}

/** Adds a medicine, or saves changes when the form has a medicationId. */
export async function saveMedicationAction(
  _previous: MedicationFormState,
  formData: FormData,
): Promise<MedicationFormState> {
  const { userId, circleId, allowed } = await healthUser(formData);
  if (!allowed) return { error: "notAllowed" };

  const parsed = parseMedication(Object.fromEntries(formData), todayInPoland());
  if ("error" in parsed) {
    return { error: parsed.error, values: typedValues(formData) };
  }

  const medicationId = String(formData.get("medicationId") ?? "");
  if (medicationId) {
    const saved = await updateMedication({
      circleId,
      medicationId,
      userId,
      input: parsed.input,
    });
    if (!saved) return { error: "notFound" };
  } else {
    await createMedication({ circleId, userId, input: parsed.input });
  }

  refresh(circleId);
  redirect(`/krag/${circleId}/leki`);
}

/** Confirms one of today's doses, or takes it back (taken = "0"). */
export async function setDoseTakenAction(formData: FormData) {
  const { userId, circleId, allowed } = await healthUser(formData);
  const medicationId = String(formData.get("medicationId") ?? "");
  const time = String(formData.get("time") ?? "");
  if (allowed && isTime(time)) {
    const dose = { circleId, medicationId, day: todayInPoland(), time, userId };
    if (formData.get("taken") === "0") await undoDose(dose);
    else await confirmDose(dose);
  }
  refresh(circleId);
}

export async function deleteMedicationAction(formData: FormData) {
  const { userId, circleId, allowed } = await healthUser(formData);
  if (allowed) {
    const medicationId = String(formData.get("medicationId") ?? "");
    await deleteMedication({ circleId, medicationId, userId });
  }
  refresh(circleId);
  redirect(`/krag/${circleId}/leki`);
}
