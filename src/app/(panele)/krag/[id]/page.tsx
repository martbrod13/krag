import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { requireUser } from "@/lib/session";
import { cancelInvitationAction } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Circles");
  return { title: t("pageTitle") };
}

export default async function CirclePage({ params }: PageProps<"/krag/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();

  const seesProfile = circle.permissions.includes("PROFILE");
  if (circle.recipient && seesProfile) {
    await logAccess({
      circleId: circle.id,
      userId: user.id,
      action: "VIEW",
      entity: "CareRecipient",
    });
  }

  const t = await getTranslations("Circles");
  const format = await getFormatter();
  const recipient = circle.recipient;
  const panel = circle.role === "CAREGIVER" ? "/opiekun" : "/rodzina";

  return (
    <>
      <Link href={panel} className="font-bold text-brand hover:underline">
        ← {t("backToPanel")}
      </Link>

      <div className="flex flex-col items-start gap-2">
        <Badge tone={circle.role === "CAREGIVER" ? "info" : "brand"}>
          {t(`roles.${circle.role}`)}
        </Badge>
        <h1 className="text-3xl font-extrabold">{circle.name}</h1>
      </div>

      {recipient ? (
        <Card className="flex flex-col gap-1">
          <h2 className="text-sm font-bold tracking-wide text-muted uppercase">
            {t("recipientTitle")}
          </h2>
          <p className="text-2xl font-extrabold">
            {recipient.age === null
              ? recipient.firstName
              : t("recipientWithAge", {
                  name: recipient.firstName,
                  age: recipient.age,
                })}
          </p>
          {recipient.city ? <p className="text-lg">{recipient.city}</p> : null}
          {recipient.address ? (
            <p className="text-muted">{recipient.address}</p>
          ) : null}
        </Card>
      ) : null}

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-xl font-extrabold">
          {t("membersTitle")}
        </h2>
        <ul className="flex flex-col gap-2">
          {circle.members.map((member) => (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span className="font-bold">
                {member.name}
                {member.userId === user.id ? (
                  <span className="font-normal text-muted"> ({t("you")})</span>
                ) : null}
              </span>
              <Badge tone={member.role === "CAREGIVER" ? "info" : "neutral"}>
                {t(`roles.${member.role}`)}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      {circle.invitations ? (
        <section aria-labelledby="invitations" className="flex flex-col gap-3">
          <ButtonLink href={`/krag/${circle.id}/zapros`} size="lg">
            {t("invite")}
          </ButtonLink>
          {circle.invitations.length > 0 ? (
            <>
              <h2 id="invitations" className="text-xl font-extrabold">
                {t("pendingTitle")}
              </h2>
              <ul className="flex flex-col gap-2">
                {circle.invitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
                  >
                    <span>
                      <span className="font-bold">
                        {t(`roles.${invitation.role}`)}
                      </span>
                      <span className="text-muted">
                        {" · "}
                        {t("validUntil", {
                          date: format.dateTime(invitation.expiresAt, {
                            day: "numeric",
                            month: "long",
                          }),
                        })}
                      </span>
                    </span>
                    <form action={cancelInvitationAction}>
                      <input type="hidden" name="circleId" value={circle.id} />
                      <input
                        type="hidden"
                        name="invitationId"
                        value={invitation.id}
                      />
                      <button
                        type="submit"
                        className={buttonClasses({ variant: "secondary" })}
                      >
                        {t("cancelInvitation")}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
