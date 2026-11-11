import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCircleForMember } from "@/lib/circles";
import { requireUser } from "@/lib/session";
import { InviteForm } from "./invite-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Invite");
  return { title: t("title") };
}

export default async function InvitePage({
  params,
}: PageProps<"/krag/[id]/zapros">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/zapros`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("MANAGE")) redirect(`/krag/${id}`);

  const t = await getTranslations("Invite");

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
      <InviteForm circleId={circle.id} circleName={circle.name} />
    </>
  );
}
