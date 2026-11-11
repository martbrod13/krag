import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { requireUser } from "@/lib/session";
import { getTask, listTaskPeople } from "@/lib/tasks";
import { deleteTaskAction } from "../actions";
import { TaskForm } from "../task-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TaskForm");
  return { title: t("editTitle") };
}

// One task: change it, or delete it (the person who added it or a
// coordinator).
export default async function TaskPage({
  params,
}: PageProps<"/krag/[id]/plan/[taskId]">) {
  const { id, taskId } = await params;
  const user = await requireUser(`/krag/${id}/plan/${taskId}`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("TASKS")) redirect(`/krag/${id}`);

  const task = await getTask(circle.id, taskId);
  if (!task) notFound();
  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "Task",
    entityId: task.id,
  });

  const people = await listTaskPeople(circle.id);
  const t = await getTranslations("TaskForm");
  const common = await getTranslations("Common");
  const canDelete =
    task.createdById === user.id || circle.role === "COORDINATOR";

  return (
    <>
      <Link
        href={`/krag/${id}/plan`}
        className="font-bold text-brand hover:underline"
      >
        ← {t("back")}
      </Link>
      <h1 className="text-3xl font-extrabold">{t("editTitle")}</h1>
      <TaskForm
        circleId={circle.id}
        taskId={task.id}
        people={people}
        saved={{
          title: task.title,
          date: task.date ?? "",
          time: task.time ?? "",
          assigneeId: task.assignee?.id ?? "",
          note: task.note ?? "",
          showToSenior: task.showToSenior ? "on" : "",
        }}
      />
      {canDelete ? (
        <form
          action={deleteTaskAction}
          className="flex flex-col gap-2 border-t border-line pt-5"
        >
          <input type="hidden" name="circleId" value={circle.id} />
          <input type="hidden" name="taskId" value={task.id} />
          <ConfirmButton
            label={t("delete")}
            confirmLabel={t("confirmDelete")}
            cancelLabel={common("cancel")}
          />
        </form>
      ) : null}
    </>
  );
}
