import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { getCircleForMember } from "@/lib/circles";
import { listMembers } from "@/lib/members";
import { requireUser } from "@/lib/session";
import { removeMemberAction } from "./actions";
import { DeleteCircleForm } from "./delete-circle-form";
import { MemberForm } from "./member-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Settings");
  return { title: t("title") };
}

// Coordinators decide here who is in the circle and what each person sees.
export default async function SettingsPage({
  params,
}: PageProps<"/krag/[id]/ustawienia">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/ustawienia`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("MANAGE")) redirect(`/krag/${id}`);

  const members = await listMembers(circle.id);
  const coordinators = members.filter(
    (member) => member.role === "COORDINATOR",
  ).length;

  const t = await getTranslations("Settings");
  const roles = await getTranslations("Circles");
  const common = await getTranslations("Common");
  const format = await getFormatter();

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

      <section aria-labelledby="people" className="flex flex-col gap-3">
        <h2 id="people" className="text-xl font-extrabold">
          {t("peopleTitle")}
        </h2>
        <p className="text-muted">{t("peopleLead")}</p>
        <ul className="flex flex-col gap-2">
          {members.map((member) => {
            const isSelf = member.userId === user.id;
            const visible = member.permissions.filter(
              (permission) => permission !== "MANAGE",
            );
            const sees =
              member.role === "COORDINATOR"
                ? t("seesAll")
                : visible.length > 0
                  ? t("sees", {
                      list: format.list(
                        visible.map((permission) =>
                          t(`permissions.${permission}.short`),
                        ),
                        { type: "conjunction" },
                      ),
                    })
                  : t("seesNothing");
            return (
              <li key={member.userId}>
                <details className="group rounded-card border border-line bg-surface">
                  <summary className="flex cursor-pointer list-none flex-col gap-1 p-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold">
                        {member.name}
                        {isSelf ? (
                          <span className="font-normal text-muted">
                            {" "}
                            ({t("you")})
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge
                          tone={
                            member.role === "CAREGIVER" ? "info" : "neutral"
                          }
                        >
                          {roles(`roles.${member.role}`)}
                        </Badge>
                        <span
                          aria-hidden="true"
                          className="text-brand transition-transform group-open:rotate-90"
                        >
                          ›
                        </span>
                      </span>
                    </span>
                    <span className="text-sm text-muted">{sees}</span>
                  </summary>
                  <div className="flex flex-col gap-5 border-t border-line p-4">
                    {isSelf && coordinators <= 1 ? (
                      <p className="text-muted">{t("onlyCoordinator")}</p>
                    ) : (
                      <MemberForm
                        circleId={circle.id}
                        memberId={member.userId}
                        role={member.role}
                        permissions={member.permissions}
                      />
                    )}
                    {isSelf ? null : (
                      <form
                        action={removeMemberAction}
                        className="border-t border-line pt-4"
                      >
                        <input
                          type="hidden"
                          name="circleId"
                          value={circle.id}
                        />
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.userId}
                        />
                        <ConfirmButton
                          label={t("remove")}
                          confirmLabel={t("confirmRemove")}
                          cancelLabel={common("cancel")}
                        />
                      </form>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">{t("upcoming")}</p>
      </section>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("dataTitle")}</h2>
        <p className="text-muted">{t("dataLead")}</p>
        <ButtonLink href={`/krag/${id}/dane`} variant="secondary">
          {t("editData")}
        </ButtonLink>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("logTitle")}</h2>
        <p className="text-muted">{t("logLead")}</p>
        <ButtonLink href={`/krag/${id}/dziennik`} variant="secondary">
          {t("openLog")}
        </ButtonLink>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-xl font-extrabold">{t("exportTitle")}</h2>
        <p className="text-muted">{t("exportLead")}</p>
        {/* A plain link: a download, not a page to prefetch. */}
        <a
          href={`/krag/${id}/ustawienia/pobierz`}
          download
          className={buttonClasses({ variant: "secondary" })}
        >
          {t("exportButton")}
        </a>
      </Card>

      <section
        aria-labelledby="delete"
        className="flex flex-col gap-3 rounded-card border border-danger/40 p-5"
      >
        <h2 id="delete" className="text-xl font-extrabold text-danger">
          {t("deleteTitle")}
        </h2>
        <p className="text-muted">{t("deleteLead")}</p>
        <DeleteCircleForm circleId={circle.id} circleName={circle.name} />
      </section>
    </>
  );
}
