"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission, parseCircleForm, updateCircle } from "@/lib/circles";
import { formValues } from "@/lib/form";
import { currentUserId } from "@/lib/session";
import type { CircleDataState } from "./circle-data-form";

const FIELDS = [
  "name",
  "firstName",
  "birthDate",
  "city",
  "address",
  "primaryDoctor",
] as const;

export async function updateCircleAction(
  _previous: CircleDataState,
  formData: FormData,
): Promise<CircleDataState> {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  if (!(await hasPermission(circleId, userId, "MANAGE"))) {
    return { error: "notAllowed" };
  }

  const parsed = parseCircleForm(Object.fromEntries(formData), new Date());
  if ("error" in parsed) {
    return { error: parsed.error, values: formValues(formData, FIELDS) };
  }

  await updateCircle({ circleId, userId, input: parsed.input });
  revalidatePath(`/krag/${circleId}`);
  redirect(`/krag/${circleId}`);
}
