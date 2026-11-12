import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCircleForMember } from "@/lib/circles";
import { todayInPoland } from "@/lib/dates";
import { MAX_TIMES } from "@/lib/medications";
import { requireUser } from "@/lib/session";
import { weekdayNames } from "@/lib/weekday-names";
import { emptyValues } from "../form-values";
import { MedicationForm } from "../medication-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MedicationForm");
  return { title: t("newTitle") };
}

// A new medicine: its name, times and amounts, days and how to take it.
export default async function NewMedicationPage({
  params,
}: PageProps<"/krag/[id]/leki/nowy">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/leki/nowy`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("HEALTH")) redirect(`/krag/${id}`);

  const t = await getTranslations("MedicationForm");

  return (
    <>
      <Link
        href={`/krag/${id}/leki`}
        className="font-bold text-brand hover:underline"
      >
        ← {t("back")}
      </Link>
      <h1 className="text-3xl font-extrabold">{t("newTitle")}</h1>
      <MedicationForm
        circleId={circle.id}
        saved={emptyValues(todayInPoland())}
        weekdayNames={await weekdayNames()}
        maxTimes={MAX_TIMES}
      />
    </>
  );
}
