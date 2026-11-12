"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { timeInPoland, todayInPoland } from "@/lib/dates";
import { formValues } from "@/lib/form";
import { currentUserId } from "@/lib/session";
import {
  VISIT_ACTIVITIES,
  createVisits,
  deleteVisit,
  getVisitViewer,
  parseReport,
  parseVisit,
  saveReport,
  startVisit,
  updateVisit,
} from "@/lib/visits";
import type { ReportFormState, ReportFormValues } from "./report-form";
import type { VisitFormState, VisitFormValues } from "./visit-form";

// The circle page shows today's visits, the visits page all of them.
function refresh(circleId: string, visitId?: string) {
  revalidatePath(`/krag/${circleId}`);
  revalidatePath(`/krag/${circleId}/wizyty`);
  if (visitId) revalidatePath(`/krag/${circleId}/wizyty/${visitId}`);
}

/** The user and how they see the circle's visits; no viewer without VISITS. */
async function visitUser(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const visitId = String(formData.get("visitId") ?? "");
  const viewer = await getVisitViewer(circleId, userId);
  return { userId, circleId, visitId, viewer };
}

const VISIT_FIELDS = [
  "date",
  "startTime",
  "endTime",
  "visitorId",
  "plan",
  "repeatWeeks",
] as const;

/** What was typed, shown again after an error (React empties the form). */
function typedVisit(formData: FormData): VisitFormValues {
  const text = formValues(formData, VISIT_FIELDS);
  return {
    date: text.date,
    startTime: text.startTime,
    endTime: text.endTime,
    visitorId: text.visitorId,
    plan: text.plan,
    repeatWeeks: text.repeatWeeks,
    weekdays: [1, 2, 3, 4, 5, 6, 7].filter(
      (day) => formData.get(`weekday${day}`) === "on",
    ),
  };
}

/** Plans a visit (or a weekly repeat), or changes one with a visitId. */
export async function saveVisitAction(
  _previous: VisitFormState,
  formData: FormData,
): Promise<VisitFormState> {
  const { circleId, visitId, viewer } = await visitUser(formData);
  if (!viewer) return { error: "notAllowed" };

  const values = typedVisit(formData);
  const parsed = parseVisit(Object.fromEntries(formData));
  if ("error" in parsed) return { error: parsed.error, values };

  if (visitId) {
    const result = await updateVisit({
      circleId,
      visitId,
      viewer,
      input: parsed.input,
    });
    if (result !== "saved") return { error: result, values };
    refresh(circleId, visitId);
    redirect(`/krag/${circleId}/wizyty/${visitId}`);
  }

  const created = await createVisits({ circleId, viewer, input: parsed.input });
  if ("error" in created) return { error: created.error, values };
  refresh(circleId);
  redirect(`/krag/${circleId}/wizyty`);
}

/** "I'm starting the visit": saves the time, never the place. */
export async function startVisitAction(formData: FormData) {
  const { userId, circleId, visitId, viewer } = await visitUser(formData);
  if (viewer) {
    await startVisit({
      circleId,
      visitId,
      userId,
      today: todayInPoland(),
      now: timeInPoland(),
    });
  }
  refresh(circleId, visitId);
}

function typedReport(formData: FormData): ReportFormValues {
  const text = formValues(formData, ["actualStart", "actualEnd", "report"]);
  return {
    actualStart: text.actualStart,
    actualEnd: text.actualEnd,
    report: text.report,
    activities: VISIT_ACTIVITIES.filter(
      (activity) => formData.get(`activity-${activity}`) === "on",
    ),
  };
}

/** Saves the report; a visit in progress ends with it. */
export async function saveReportAction(
  _previous: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const { userId, circleId, visitId, viewer } = await visitUser(formData);
  if (!viewer) return { error: "notAllowed" };

  const values = typedReport(formData);
  const parsed = parseReport(Object.fromEntries(formData));
  if ("error" in parsed) return { error: parsed.error, values };

  const result = await saveReport({
    circleId,
    visitId,
    userId,
    today: todayInPoland(),
    input: parsed.input,
  });
  if (result !== "saved") return { error: result, values };
  refresh(circleId, visitId);
  return { saved: true };
}

export async function deleteVisitAction(formData: FormData) {
  const { userId, circleId, visitId, viewer } = await visitUser(formData);
  if (viewer) await deleteVisit({ circleId, visitId, userId });
  refresh(circleId);
  redirect(`/krag/${circleId}/wizyty`);
}
