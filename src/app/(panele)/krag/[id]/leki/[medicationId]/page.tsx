import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { MAX_TIMES, getMedication } from "@/lib/medications";
import { requireUser } from "@/lib/session";
import { deleteMedicationAction } from "../actions";
import { valuesOf, weekdayNames } from "../form-values";
import { MedicationForm } from "../medication-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MedicationForm");
  return { title: t("editTitle") };
}

// One medicine: change it, or delete it with its history (the person who
// added it or a coordinator).
export default async function MedicationPage({
  params,
}: PageProps<"/krag/[id]/leki/[medicationId]">) {
  const { id, medicationId } = await params;
  const user = await requireUser(`/krag/${id}/leki/${medicationId}`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("HEALTH")) redirect(`/krag/${id}`);

  const medication = await getMedication(circle.id, medicationId);
  if (!medication) notFound();
  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "Medication",
    entityId: medication.id,
  });

  const t = await getTranslations("MedicationForm");
  const common = await getTranslations("Common");
  const meds = await getTranslations("Medications");
  const format = await getFormatter();
  const canDelete =
    medication.createdById === user.id || circle.role === "COORDINATOR";

  return (
    <>
      <Link
        href={`/krag/${id}/leki`}
        className="font-bold text-brand hover:underline"
      >
        ← {t("back")}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold break-words">
          {medication.name}
        </h1>
        <p className="text-muted">
          {t("lastChange", {
            name: medication.updatedBy ?? meds("someone"),
            date: format.dateTime(medication.updatedAt, {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </p>
      </div>
      <MedicationForm
        circleId={circle.id}
        medicationId={medication.id}
        saved={valuesOf(medication)}
        weekdayNames={await weekdayNames()}
        maxTimes={MAX_TIMES}
      />
      {canDelete ? (
        <form
          action={deleteMedicationAction}
          className="flex flex-col gap-2 border-t border-line pt-5"
        >
          <input type="hidden" name="circleId" value={circle.id} />
          <input type="hidden" name="medicationId" value={medication.id} />
          <p className="text-muted">{t("deleteHint")}</p>
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
