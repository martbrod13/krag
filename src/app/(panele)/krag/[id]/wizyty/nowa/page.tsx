import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCircleForMember } from "@/lib/circles";
import { isDay, todayInPoland } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { REPEAT_WEEKS, listVisitPeople } from "@/lib/visits";
import { weekdayNames } from "@/lib/weekday-names";
import { VisitForm } from "../visit-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("VisitForm");
  return { title: t("newTitle") };
}

// Plans a visit: the day (?dzien=YYYY-MM-DD), the times, who comes, what to
// do, and optionally a weekly repeat.
export default async function NewVisitPage({
  params,
  searchParams,
}: PageProps<"/krag/[id]/wizyty/nowa">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/wizyty/nowa`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("VISITS")) redirect(`/krag/${id}`);

  const asked = (await searchParams).dzien;
  const date =
    typeof asked === "string" && isDay(asked) ? asked : todayInPoland();
  const caregiver = circle.role === "CAREGIVER";
  const people = caregiver ? [] : await listVisitPeople(circle.id);
  const t = await getTranslations("VisitForm");

  return (
    <>
      <Link
        href={`/krag/${id}/wizyty`}
        className="font-bold text-brand hover:underline"
      >
        ← {t("back")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("newTitle")}</h1>
        {caregiver ? (
          <p className="text-lg text-muted">{t("ownVisit")}</p>
        ) : null}
      </div>
      <VisitForm
        circleId={circle.id}
        saved={{
          date,
          startTime: "",
          endTime: "",
          visitorId: people.length === 1 ? people[0].id : "",
          plan: "",
          repeatWeeks: "",
          weekdays: [],
        }}
        people={people}
        weekdayNames={await weekdayNames()}
        repeatWeeks={REPEAT_WEEKS}
      />
    </>
  );
}
