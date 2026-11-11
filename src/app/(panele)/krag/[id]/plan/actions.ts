"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/circles";
import { formValues } from "@/lib/form";
import { currentUserId } from "@/lib/session";
import {
  claimTask,
  createTask,
  deleteTask,
  parseTask,
  setTaskDone,
  updateTask,
} from "@/lib/tasks";
import type { TaskFormState } from "./task-form";

const TASK_FIELDS = ["title", "date", "time", "assigneeId", "note"] as const;

// The circle page shows today's plan, the plan page shows all of it.
function refresh(circleId: string) {
  revalidatePath(`/krag/${circleId}`);
  revalidatePath(`/krag/${circleId}/plan`);
}

/** The user's id, if they may see and change the circle's tasks. */
async function taskUser(formData: FormData) {
  const userId = await currentUserId();
  const circleId = String(formData.get("circleId") ?? "");
  const allowed = await hasPermission(circleId, userId, "TASKS");
  return { userId, circleId, allowed };
}

/** Adds a task, or saves changes when the form has a taskId. */
export async function saveTaskAction(
  _previous: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const { userId, circleId, allowed } = await taskUser(formData);
  if (!allowed) return { error: "notAllowed" };

  const parsed = parseTask(Object.fromEntries(formData));
  if ("error" in parsed) {
    return {
      error: parsed.error,
      values: {
        ...formValues(formData, TASK_FIELDS),
        showToSenior: formData.get("showToSenior") === "on" ? "on" : "",
      },
    };
  }

  const taskId = String(formData.get("taskId") ?? "");
  if (taskId) {
    const saved = await updateTask({
      circleId,
      taskId,
      userId,
      input: parsed.input,
    });
    if (!saved) return { error: "notFound" };
  } else {
    await createTask({ circleId, userId, input: parsed.input });
  }

  refresh(circleId);
  redirect(`/krag/${circleId}/plan`);
}

/** "I'll take it". */
export async function claimTaskAction(formData: FormData) {
  const { userId, circleId, allowed } = await taskUser(formData);
  if (allowed) {
    const taskId = String(formData.get("taskId") ?? "");
    await claimTask({ circleId, taskId, userId });
  }
  refresh(circleId);
}

/** Marks a task as done, or as not done again (done = "0"). */
export async function setTaskDoneAction(formData: FormData) {
  const { userId, circleId, allowed } = await taskUser(formData);
  if (allowed) {
    const taskId = String(formData.get("taskId") ?? "");
    const done = formData.get("done") !== "0";
    await setTaskDone({ circleId, taskId, userId, done });
  }
  refresh(circleId);
}

export async function deleteTaskAction(formData: FormData) {
  const { userId, circleId, allowed } = await taskUser(formData);
  if (allowed) {
    const taskId = String(formData.get("taskId") ?? "");
    await deleteTask({ circleId, taskId, userId });
  }
  refresh(circleId);
  redirect(`/krag/${circleId}/plan`);
}
