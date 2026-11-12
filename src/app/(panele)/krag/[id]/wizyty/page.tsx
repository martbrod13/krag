import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { dayForDisplay, todayInPoland } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { getVisitsPage } from "@/lib/visits";
import { VisitItem } from "./visit-item";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Visits");
  return { title: t("title") };
}

// Visits: the one in progress, today's, the next days' and earlier ones
// with their reports. A caregiver sees only their own visits.
export default async function VisitsPage({
  params,
}: PageProps<"/krag/[id]/wizyty">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/wizyty`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("VISITS")) redirect(`/krag/${id}`);

  const today = todayInPoland();
  const viewer = { userId: user.id, role: circle.role };
  const page = await getVisitsPage(circle.id, viewer, today);
  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "Visit",
  });

  const t = await getTranslations("Visits");
  const format = await getFormatter();
  const dayName = (day: string) =>
    format.dateTime(dayForDisplay(day), {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  const caregiver = circle.role === "CAREGIVER";
  const nothing =
    page.inProgress.length +
      page.today.length +
      page.upcoming.length +
      page.past.length ===
    0;

  const heading = (text: string) => (
    <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
      {text}
    </h2>
  );
  const list = (visits: typeof page.today, showDay = false) => (
    <ul className="flex flex-col gap-2">
      {visits.map((visit) => (
        <VisitItem
          key={visit.id}
          visit={visit}
          circleId={circle.id}
          today={today}
          showDay={showDay}
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
        <p className="text-lg text-muted">
          {caregiver ? t("leadCaregiver") : t("lead")}
        </p>
      </div>
      <ButtonLink href={`/krag/${id}/wizyty/nowa`} size="lg">
        {t("add")}
      </ButtonLink>

      {nothing ? <p className="text-lg text-muted">{t("empty")}</p> : null}

      {page.inProgress.length > 0 ? (
        <section className="flex flex-col gap-2">
          {heading(t("nowTitle"))}
          {list(page.inProgress, true)}
        </section>
      ) : null}

      {nothing ? null : (
        <section className="flex flex-col gap-2">
          {heading(t("today", { date: dayName(today) }))}
          {page.today.length > 0 ? (
            list(page.today)
          ) : (
            <p className="text-muted">{t("noneToday")}</p>
          )}
        </section>
      )}

      {page.upcoming.length > 0 ? (
        <section className="flex flex-col gap-4">
          {heading(t("upcomingTitle"))}
          {page.upcoming.map((group) => (
            <div key={group.day} className="flex flex-col gap-2">
              <h3 className="font-bold">{dayName(group.day)}</h3>
              {list(group.visits)}
            </div>
          ))}
        </section>
      ) : null}

      {page.past.length > 0 ? (
        <section className="flex flex-col gap-2">
          {heading(t("pastTitle"))}
          {list(page.past, true)}
        </section>
      ) : null}
    </>
  );
}
