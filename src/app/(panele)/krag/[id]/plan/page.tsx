import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { cx } from "@/lib/cx";
import { addDays, dayForDisplay, todayInPoland } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getPlan, type TaskView } from "@/lib/tasks";
import { TaskItem } from "./task-item";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Plan");
  return { title: t("title") };
}

// The circle's plan: what is late, today, the next days, tasks without a
// day and what was done recently.
export default async function PlanPage({
  params,
}: PageProps<"/krag/[id]/plan">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/plan`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("TASKS")) redirect(`/krag/${id}`);

  const today = todayInPoland();
  const plan = await getPlan(circle.id, today);
  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "Task",
  });

  const t = await getTranslations("Plan");
  const format = await getFormatter();
  const tomorrow = addDays(today, 1);
  const dayName = (day: string) =>
    format.dateTime(dayForDisplay(day), {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  const list = (tasks: TaskView[], withDay = false) => (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          circleId={circle.id}
          userId={user.id}
          day={withDay && task.date ? dayName(task.date) : undefined}
        />
      ))}
    </ul>
  );

  const heading = (text: string, danger = false) => (
    <h2
      className={cx(
        "text-sm font-bold tracking-wide uppercase",
        danger ? "text-danger" : "text-muted",
      )}
    >
      {text}
    </h2>
  );

  return (
    <>
      <Link
        href={`/krag/${id}`}
        className="font-bold text-brand hover:underline"
      >
        ← {circle.name}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead")}</p>
      </div>
      <ButtonLink href={`/krag/${id}/plan/nowe`} size="lg">
        {t("add")}
      </ButtonLink>

      {plan.overdue.length > 0 ? (
        <section className="flex flex-col gap-2">
          {heading(t("overdue"), true)}
          {list(plan.overdue, true)}
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        {heading(t("today", { date: dayName(today) }))}
        {plan.today.length > 0 ? (
          list(plan.today)
        ) : (
          <p className="text-muted">{t("nothingToday")}</p>
        )}
      </section>

      {plan.upcoming.map((day) => (
        <section key={day.day} className="flex flex-col gap-2">
          {heading(
            day.day === tomorrow
              ? t("tomorrow", { date: dayName(day.day) })
              : dayName(day.day),
          )}
          {list(day.tasks)}
        </section>
      ))}

      {plan.undated.length > 0 ? (
        <section className="flex flex-col gap-2">
          {heading(t("undated"))}
          {list(plan.undated)}
        </section>
      ) : null}

      {plan.done.length > 0 ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="transition-transform group-open:rotate-90"
            >
              ›
            </span>
            {t("doneTitle")}
          </summary>
          <div className="mt-2">{list(plan.done, true)}</div>
        </details>
      ) : null}
    </>
  );
}
