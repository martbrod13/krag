import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SeniorScreen } from "@/components/senior/senior-screen";
import { ButtonLink } from "@/components/ui/button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { timeInPoland, todayInPoland } from "@/lib/dates";
import { getDoses, slotsOf } from "@/lib/medications";
import { getTodayVisits } from "@/lib/visits";
import { requireUser } from "@/lib/session";
import { getSeniorPlan } from "@/lib/tasks";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Preview");
  return { title: t("title") };
}

// The family sees exactly what the senior's phone or tablet shows, e.g. to
// help on the phone: "tap the green button with Ania".
export default async function PreviewPage({
  params,
}: PageProps<"/krag/[id]/podglad">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/podglad`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  const contacts = circle.contacts;
  if (!contacts) redirect(`/krag/${id}`);

  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "CareRecipient",
  });

  // Tasks, medicines and visits only for people who may see them; a
  // caregiver sees only their own visits (data map, decision 2).
  const today = todayInPoland();
  const viewer = { userId: user.id, role: circle.role };
  const [plan, doses, visits] = await Promise.all([
    circle.permissions.includes("TASKS") ? getSeniorPlan(circle.id, today) : [],
    circle.permissions.includes("HEALTH")
      ? getDoses(circle.id, today, { seniorOnly: true })
      : [],
    circle.permissions.includes("VISITS")
      ? getTodayVisits(circle.id, today, viewer)
      : [],
  ]);
  const t = await getTranslations("Preview");
  const manages = circle.permissions.includes("MANAGE");

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

      <div className="rounded-[2rem] border-4 border-ink/80 bg-canvas px-4 py-6">
        <SeniorScreen
          contacts={contacts}
          plan={plan}
          medicines={slotsOf(doses, timeInPoland())}
          visits={visits}
          preview
        />
      </div>

      {manages ? (
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/krag/${id}/polacz`} size="lg">
            {t("pair")}
          </ButtonLink>
          <ButtonLink href={`/krag/${id}/numery`} size="lg" variant="secondary">
            {t("editContacts")}
          </ButtonLink>
        </div>
      ) : null}
    </>
  );
}
