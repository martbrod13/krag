import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { CheckIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { cx } from "@/lib/cx";
import { dayForDisplay, timeInPoland, todayInPoland } from "@/lib/dates";
import {
  deleteOldIntakes,
  getDoses,
  getRecentDays,
  listMedications,
} from "@/lib/medications";
import { requireUser } from "@/lib/session";
import { DoseItem } from "./dose-item";
import { weekdayNames } from "./form-values";
import { MedicationCard } from "./medication-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Medications");
  return { title: t("title") };
}

// The circle's medicines: today's doses, how the last days went, every
// medicine and the ones no longer taken.
export default async function MedicationsPage({
  params,
}: PageProps<"/krag/[id]/leki">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/leki`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("HEALTH")) redirect(`/krag/${id}`);

  const today = todayInPoland();
  const now = timeInPoland();
  await deleteOldIntakes(circle.id, today);
  const [medications, doses, recent, names] = await Promise.all([
    listMedications(circle.id),
    getDoses(circle.id, today),
    getRecentDays(circle.id, today),
    weekdayNames(),
  ]);
  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "Medication",
  });

  const t = await getTranslations("Medications");
  const format = await getFormatter();
  const dayName = (day: string, weekday: "long" | "short" = "long") =>
    format.dateTime(dayForDisplay(day), {
      weekday,
      day: "numeric",
      month: "long",
    });
  const current = medications.filter(
    (medication) => !medication.endDate || medication.endDate >= today,
  );
  const ended = medications.filter(
    (medication) => medication.endDate && medication.endDate < today,
  );

  const heading = (text: string) => (
    <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
      {text}
    </h2>
  );
  const cards = (list: typeof medications) => (
    <ul className="flex flex-col gap-2">
      {list.map((medication) => (
        <MedicationCard
          key={medication.id}
          medication={medication}
          circleId={circle.id}
          weekdayNames={names}
          today={today}
        />
      ))}
    </ul>
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
      <ButtonLink href={`/krag/${id}/leki/nowy`} size="lg">
        {t("add")}
      </ButtonLink>

      {medications.length === 0 ? (
        <p className="text-lg text-muted">{t("empty")}</p>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            {heading(t("today", { date: dayName(today) }))}
            {doses.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {doses.map((dose) => (
                  <DoseItem
                    key={`${dose.medicationId} ${dose.time}`}
                    dose={dose}
                    circleId={circle.id}
                    now={now}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-muted">{t("nothingToday")}</p>
            )}
          </section>

          {recent.length > 0 ? (
            <section className="flex flex-col gap-2">
              {heading(t("recentTitle"))}
              <ul className="flex flex-col divide-y divide-line rounded-card border border-line bg-surface">
                {recent.map((day) => {
                  const complete = day.taken === day.planned;
                  return (
                    <li
                      key={day.day}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span>{dayName(day.day, "short")}</span>
                      <span
                        className={cx(
                          "flex items-center gap-2 font-bold tabular-nums",
                          complete ? "text-brand" : "text-warn",
                        )}
                      >
                        {complete ? <CheckIcon className="size-5" /> : null}
                        {t("recentCount", {
                          taken: day.taken,
                          planned: day.planned,
                        })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {current.length > 0 ? (
            <section className="flex flex-col gap-2">
              {heading(t("allTitle"))}
              {cards(current)}
            </section>
          ) : null}

          {ended.length > 0 ? (
            <details className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-90"
                >
                  ›
                </span>
                {t("endedTitle")}
              </summary>
              <div className="mt-2">{cards(ended)}</div>
            </details>
          ) : null}
        </>
      )}
    </>
  );
}
