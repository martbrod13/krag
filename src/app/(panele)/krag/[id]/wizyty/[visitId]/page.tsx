import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { dayForDisplay, timeInPoland, todayInPoland } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import {
  REPEAT_WEEKS,
  VISIT_ACTIVITIES,
  getVisit,
  isInProgress,
  isMissedVisit,
  listVisitPeople,
} from "@/lib/visits";
import { weekdayNames } from "@/lib/weekday-names";
import { deleteVisitAction, startVisitAction } from "../actions";
import { ReportForm } from "../report-form";
import { VisitForm } from "../visit-form";
import { timeRange } from "../visit-item";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Visits");
  return { title: t("visitTitle") };
}

// One visit. The person who comes starts it and writes the report; everyone
// else who sees it reads the report. The day and times can be changed, and
// the person who planned it or a coordinator can delete it.
export default async function VisitPage({
  params,
}: PageProps<"/krag/[id]/wizyty/[visitId]">) {
  const { id, visitId } = await params;
  const user = await requireUser(`/krag/${id}/wizyty/${visitId}`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("VISITS")) redirect(`/krag/${id}`);

  const viewer = { userId: user.id, role: circle.role };
  const visit = await getVisit(circle.id, visitId, viewer);
  if (!visit) notFound();
  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "Visit",
    entityId: visit.id,
  });

  const today = todayInPoland();
  const now = timeInPoland();
  const caregiver = circle.role === "CAREGIVER";
  const isVisitor = visit.visitor?.id === user.id;
  const inProgress = isInProgress(visit);
  const canDelete =
    visit.createdById === user.id || circle.role === "COORDINATOR";
  const people = caregiver ? [] : await listVisitPeople(circle.id);

  const t = await getTranslations("Visits");
  const report = await getTranslations("VisitReport");
  const form = await getTranslations("VisitForm");
  const common = await getTranslations("Common");
  const format = await getFormatter();

  const reportForm = (
    <ReportForm
      circleId={circle.id}
      visitId={visit.id}
      saved={{
        actualStart: visit.actualStart ?? visit.startTime,
        actualEnd:
          visit.actualEnd ??
          (inProgress || visit.date === today ? now : (visit.endTime ?? "")),
        activities: visit.activities,
        report: visit.report ?? "",
      }}
      activities={VISIT_ACTIVITIES}
      ending={inProgress}
    />
  );

  let status: ReactNode = null;
  if (inProgress) {
    status = (
      <p className="text-lg font-bold text-brand">
        {t("inProgress", { time: visit.actualStart ?? "" })}
      </p>
    );
  } else if (visit.actualStart && visit.actualEnd) {
    status = (
      <p className="text-lg text-muted">
        {t("happened", { time: timeRange(visit.actualStart, visit.actualEnd) })}
      </p>
    );
  } else if (isMissedVisit(visit, today)) {
    status = <p className="text-lg font-bold text-warn">{t("missed")}</p>;
  }

  return (
    <>
      <Link
        href={`/krag/${id}/wizyty`}
        className="font-bold text-brand hover:underline"
      >
        ← {form("back")}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold break-words">
          {visit.visitor?.name ?? t("noVisitor")}
        </h1>
        <p className="text-lg">
          {format.dateTime(dayForDisplay(visit.date), {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          ,{" "}
          <span className="tabular-nums">
            {timeRange(visit.startTime, visit.endTime)}
          </span>
        </p>
        {status}
      </div>

      {visit.plan ? (
        <Card className="flex flex-col gap-1">
          <h2 className="font-bold">{t("planTitle")}</h2>
          <p className="whitespace-pre-line">{visit.plan}</p>
        </Card>
      ) : null}

      {isVisitor && visit.date === today && !visit.actualStart ? (
        <form action={startVisitAction} className="flex flex-col gap-2">
          <input type="hidden" name="circleId" value={circle.id} />
          <input type="hidden" name="visitId" value={visit.id} />
          <SubmitButton size="xl">{t("start")}</SubmitButton>
          <p className="text-muted">{t("startHint")}</p>
        </form>
      ) : null}

      {isVisitor && visit.date > today ? (
        <p className="text-muted">{t("reportLater")}</p>
      ) : null}

      {isVisitor && visit.date <= today ? (
        visit.actualStart || visit.date < today ? (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold">{report("title")}</h2>
            {reportForm}
          </section>
        ) : (
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="transition-transform group-open:rotate-90"
              >
                ›
              </span>
              {t("alreadyHappened")}
            </summary>
            <div className="mt-3">{reportForm}</div>
          </details>
        )
      ) : null}

      {!isVisitor && visit.reportedAt ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-extrabold">{report("title")}</h2>
          <Card className="flex flex-col gap-3">
            {visit.activities.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {visit.activities.map((activity) => (
                  <li
                    key={activity}
                    className="rounded-full bg-brand-soft px-3 py-1 text-brand-strong"
                  >
                    {report(`activities.${activity}`)}
                  </li>
                ))}
              </ul>
            ) : null}
            {visit.report ? (
              <p className="text-lg whitespace-pre-line">{visit.report}</p>
            ) : null}
            <p className="text-sm text-muted">
              {report("savedAt", {
                date: format.dateTime(visit.reportedAt, {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
            </p>
          </Card>
        </section>
      ) : null}

      <details className="group border-t border-line pt-5">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="transition-transform group-open:rotate-90"
          >
            ›
          </span>
          {form("editTitle")}
        </summary>
        <div className="mt-3">
          <VisitForm
            circleId={circle.id}
            visitId={visit.id}
            saved={{
              date: visit.date,
              startTime: visit.startTime,
              endTime: visit.endTime ?? "",
              visitorId: visit.visitor?.id ?? "",
              plan: visit.plan ?? "",
              repeatWeeks: "",
              weekdays: [],
            }}
            people={people}
            weekdayNames={await weekdayNames()}
            repeatWeeks={REPEAT_WEEKS}
          />
        </div>
      </details>

      {canDelete ? (
        <form action={deleteVisitAction} className="flex flex-col gap-2">
          <input type="hidden" name="circleId" value={circle.id} />
          <input type="hidden" name="visitId" value={visit.id} />
          <ConfirmButton
            label={form("delete")}
            confirmLabel={form("confirmDelete")}
            cancelLabel={common("cancel")}
          />
        </form>
      ) : null}
    </>
  );
}
