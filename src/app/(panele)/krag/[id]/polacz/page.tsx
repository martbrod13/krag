import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCircleForMember } from "@/lib/circles";
import { requireUser } from "@/lib/session";
import { PairDevice } from "./pair-device";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PairDevice");
  return { title: t("title") };
}

// A coordinator shows a QR code here; the senior's phone or tablet scans it.
export default async function PairDevicePage({
  params,
}: PageProps<"/krag/[id]/polacz">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/polacz`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("MANAGE")) redirect(`/krag/${id}`);

  const t = await getTranslations("PairDevice");

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
      <PairDevice circleId={circle.id} circleName={circle.name} />
    </>
  );
}
