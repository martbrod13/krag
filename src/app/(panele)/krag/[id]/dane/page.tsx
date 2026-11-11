import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { logAccess } from "@/lib/audit";
import { getCircleForMember, getCircleFormValues } from "@/lib/circles";
import { requireUser } from "@/lib/session";
import { CircleDataForm } from "./circle-data-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CircleData");
  return { title: t("title") };
}

// Coordinators change the circle's name and the care recipient's data here:
// first name, birth date, city, address and primary doctor.
export default async function CircleDataPage({
  params,
}: PageProps<"/krag/[id]/dane">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/dane`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("MANAGE")) redirect(`/krag/${id}`);

  const saved = await getCircleFormValues(circle.id);
  if (!saved) notFound();
  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "CareRecipient",
  });

  const t = await getTranslations("CircleData");

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
      <CircleDataForm circleId={circle.id} saved={saved} />
    </>
  );
}
