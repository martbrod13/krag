import Link from "next/link";
import { useTranslations } from "next-intl";
import { CheckIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cx } from "@/lib/cx";
import type { TaskView } from "@/lib/tasks";
import { claimTaskAction, setTaskDoneAction } from "./actions";

type TaskItemProps = {
  task: TaskView;
  circleId: string;
  userId: string;
  /** The day, written out, where the list does not show it already. */
  day?: string;
};

/** One task: a round "done" button, the text, who takes care of it. */
export function TaskItem({ task, circleId, userId, day }: TaskItemProps) {
  const t = useTranslations("Plan");
  const hidden = (
    <>
      <input type="hidden" name="circleId" value={circleId} />
      <input type="hidden" name="taskId" value={task.id} />
    </>
  );

  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-surface p-3">
      <form action={setTaskDoneAction}>
        {hidden}
        <input type="hidden" name="done" value={task.done ? "0" : "1"} />
        <button
          type="submit"
          aria-label={
            task.done
              ? t("markNotDone", { title: task.title })
              : t("markDone", { title: task.title })
          }
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand",
            task.done
              ? "border-brand bg-brand text-white"
              : "border-line text-transparent hover:border-brand hover:text-brand",
          )}
        >
          <CheckIcon className="size-6" />
        </button>
      </form>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link
          href={`/krag/${circleId}/plan/${task.id}`}
          className={cx(
            "flex min-h-11 flex-wrap items-center gap-x-2 font-bold break-words hover:underline",
            task.done && "text-muted line-through",
          )}
        >
          {day ? <span className="font-normal text-muted">{day}</span> : null}
          {task.time ? <span className="tabular-nums">{task.time}</span> : null}
          <span>{task.title}</span>
        </Link>
        {task.note ? (
          <p className="text-sm whitespace-pre-line text-muted">{task.note}</p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {task.done ? (
            <span className="text-muted">
              {t("doneBy", { name: task.doneBy ?? t("someone") })}
            </span>
          ) : task.assignee ? (
            <span className="text-muted">
              {task.assignee.id === userId
                ? t("assignedToYou")
                : t("assignedTo", { name: task.assignee.name })}
            </span>
          ) : (
            <form action={claimTaskAction}>
              {hidden}
              <button
                type="submit"
                className={buttonClasses({ variant: "secondary" })}
              >
                {t("claim")}
              </button>
            </form>
          )}
          {task.showToSenior ? (
            <Badge tone="info">{t("seniorSees")}</Badge>
          ) : null}
        </div>
      </div>
    </li>
  );
}
